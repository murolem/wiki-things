-- Module:ItemBucket
-- Usage on a page: {{#invoke:ItemBucket|infobox|shotgun}}

local Locale = require("Module:Locale")
local getArgs = require("Module:Arguments").getArgs
local liquidBucket = require("Module:LiquidBucket")
local bit32 = require( 'bit32' )
local yesNo = require("Module:Yesno")
local tmpRenderer = require("Module:TMPRender")
local bucketUtils = require("Module:BucketUtils")

-- if true, enables debug printing. to be used when editing this module.
local DEBUG = false

local p = {}
local lang = mw.getContentLanguage()

local DETAIL_COLUMNS = {
    "item_id", "weight", "value", "tags", "qualities", "slot_rotation",
    "usable", "usable_on_limb", "usable_with_lmb", "auto_attack", "only_hold_in_hands",
    "combineable", "destroy_at_zero_condition", "scale_weight_with_condition",
    "ignore_depression", "decay_minutes", "rot_speed", "decay_info", "rec",
    "wearable", "wearable_can_be_held", "wear_slot_id", "desired_wear_limb",
    "wearable_armor", "wearable_isolation", "wear_hit_dur_loss_mult",
    "jump_height_mult_change", "wearable_visual_offset",
}

function p.fetch(itemId)
    local index = bucketUtils.firstRow(bucket("item")
        .select("item_id", "category", "subtype", "weight", "value", "tags", "usable", "wearable", "combineable", "obtainable")
        .where("item_id", itemId)
        .run())

    if not index then return nil end

    local row = {}
    bucketUtils.merge(row, index)

    local category = row.category or "custom"
    local detail = bucketUtils.firstRow(bucket("item_" .. category)
        .select(unpack(DETAIL_COLUMNS))
        .where("item_id", itemId)
        .run())
    bucketUtils.merge(row, detail)

    if row.subtype == "liquid" then
        bucketUtils.merge(row, bucketUtils.firstRow(bucket("item_liquid")
            .select("capacity", "auto_fill", "default_contents")
            .where("item_id", itemId)
            .run()))
    elseif row.subtype == "battery" then
        bucketUtils.merge(row, bucketUtils.firstRow(bucket("item_battery")
            .select("max_charge")
            .where("item_id", itemId)
            .run()))
    end

    return row
end

local function format_decay(minutes)
    local durationStr = lang:formatDuration(minutes * 60)
    return tostring(mw.html.create("span")
        :wikitext("<b>[[File:Icon_decay.png|16px|class=pixelated]]&nbsp;" .. durationStr .. "</b>"))
end

---Format sounds params and writes results to the resulting table. 
---Goes through all of them as long as they are consecutive.
local function format_sounds(frame, rowTbl, resTbl)
    local idx = 1
    while true do
        local sound = rowTbl["sound"..idx]
        if not sound then break end

        local caption = rowTbl["sound"..idx.."_caption"]

        local wrapper = mw.html.create("div")
        
        wrapper:wikitext(frame:expandTemplate{ title = "Audio/tiny", args = { file = sound } })

        if caption then 
            wrapper:wikitext(res .. "<br>" .. caption)
        end
        
        resTbl["sound"..idx] = tostring(wrapper)
        idx = idx + 1
    end
end

function p.infobox(frame)
    local args = getArgs(frame)

    local itemId = args.item_id or args[1] or args["1"]
    itemId = itemId and mw.text.trim(tostring(itemId)) or ""
    if itemId == "" then
        return "[[Category:Errors]]<strong>ItemBucket:</strong> missing item id."
    end

    local row = p.fetch(itemId)
    if not row then
        return "[[Category:Errors]]<strong>ItemBucket:</strong> no Bucket row for '" .. itemId .. "'."
    end

    local lang = Locale.resolveLang(frame)
    local localeItem = Locale.getItem(itemId, lang)

    if DEBUG then 
        mw.log("> lang")
        mw.logObject(lang)
        mw.log("> localeItem")
        mw.logObject(localeItem)
        mw.log("> args")
        mw.logObject(args)
        mw.log("> row")
        mw.logObject(row)
    end

    local resArgs = {
        item_id = itemId,
        display_name = localeItem and localeItem.name or itemId,
        description = tmpRenderer.render_tmp_text(localeItem and localeItem.description or ""),
    }
    local yesTemplate = tostring(frame:expandTemplate{ title = "yes" })

    for key, value in pairs(row) do
        if key == "decay_minutes" or key == "rot_speed" then
            -- - decayMinutes = minutes it takes for the item to decay. can sometimes be 0 and rotSpeed be non zero - see rotSpeed.
            -- - rotSpeed = 1.666f / decayMinutes (ie you could say it duplicates decayMinutes - in most cases).
            -- decayMinutes can be calculated back via "(100 / rotSpeed) / 60" (+round to get rid of float err).
            -- correlates with decayMinutes UNLESS decayMinutes is 0, then this value is used. if both are 0, then they are 0
            -- rotSpeed can also be NEGATIVE, which means that the item doesn't decay - instead it regenerates.

            local decayMinutes = row.decay_minutes
            local rotSpeed = row.rot_speed

            if decayMinutes and decayMinutes ~= 0 then
                resArgs.decay_duration = format_decay(decayMinutes)
            elseif rotSpeed and rotSpeed ~= 0 then
                decayMinutes = bucketUtils.roundToDigit((100 / rotSpeed) / 60, 1)

                if decayMinutes >= 0 then
                    resArgs.decay_duration = format_decay(decayMinutes)
                else
                    resArgs.regenerate_duration = format_decay(-decayMinutes)
                end
            end
        elseif key == "decay_info" then
            -- decayInfo = flag
            -- public enum DecayType : byte
            -- {
            --     NoDecayWithoutContainerItem = 1, - doesn't decay when doesn't have items inside
            --     NoDecayWhenNotWorn = 2, doesn't decay when not worn
            --     NoDecayWhenStill = 4, doesn't decay when standing still
            --     BatteryDecay = 0x10 = uses charge instead of using hp for decay (stuff like flashlight, gravbag)
            -- }

            local decayInfo = value

            if bit32.btest(decayInfo, 1) then resArgs.no_decay_when_empty_as_container = yesTemplate end
            if bit32.btest(decayInfo, 2) then resArgs.no_decay_when_not_worn = yesTemplate end
            if bit32.btest(decayInfo, 4) then resArgs.no_decay_when_standing_still = yesTemplate end
            if bit32.btest(decayInfo, 8) then resArgs.battery_charge_as_decay = yesTemplate end
        elseif key == "weight" then
            local weight = row.weight
            local scaleWeightWithCondition = yesNo(row.scale_weight_with_condition)

            local res = ""
            if weight then
                res = "{{ui icon|weight|" .. weight .. "}}"

                if scaleWeightWithCondition then
                    res = res .. " " .. '<br><span style="color: gray; filter: contrast(25%);">{{ui icon|weight|0.1}} <sub style="vertical-align: middle;">(minimal)</sub></span>'
                end
            end
            resArgs.weight = frame:preprocess(res)
        elseif key == "default_contents" then
            local function process (args)
                -- column: Substance 
                if args.column == 1 then
                    local liquidId = args.value
                    local liquidLoc = Locale.getLiquid(liquidId, lang)
                    local liquidRow = liquidBucket.fetch(liquidId)
                    local name = liquidLoc and liquidLoc.name or nil

                    local res
                    if name then
                        local page = name.." (liquid)"
                        res = "[[" .. page .. "|" .. name .. "]]"
                    else
                        res = name
                    end

                    local color = liquidRow.color or "transparent"
                    return '<span style="--liquid-col: '..color..';">'..res..'</span>'
                -- column: Amount 
                elseif args.column == 2 then
                    local valueNum = tonumber(args.value)
                    if valueNum == nil then error("failed to parse amount in 'default_contents' to number; value: " .. args.value) end
                    args.value = valueNum
                end

                return args.value
            end

            local function postprocess(args)
                if #args.rows < 2 then return end

                local amounts = bucketUtils.mapArrayTable(args.rows, function (row)
                    -- column: Amount 
                    return row[2]
                end)

                local totalAmount = bucketUtils.reduceArrayTable(amounts, function (acc, value)
                    -- can add bcs converted to number in process step
                    return acc + value
                end, 0)

                for _, row in ipairs(args.rows) do
                    for column, value in ipairs(row) do
                        -- column: Amount 
                        if column == 2 then
                            local percentage = bucketUtils.roundToDigit(value / totalAmount * 100, 1)
                            -- add how much of the resulting sludge the substance composes
                            row[column] = value .. " <sup style='color: var(--text-subtle); font-size: .7em;'>("..percentage.."%)</sup>"
                        end
                    end
                end
            end

            resArgs[key] = tostring(bucketUtils.listToTableEl{
                caption = frame:preprocess("{{ui tooltip|Contents|Default contents of this container.}}"),
                headers = { "Substance", "Amount (mL)" }, 
                rows = value, 
                process = process,
                postprocess = postprocess
            })
        elseif key == "qualities" then
            local qualityLcToCategoryMap = {
                cutting = "[[Category:Tools]]",
                hammering = "[[Category:Tools]]",
            }

            local function process (args)
                -- column: Quality 
                if args.column == 1 then
                    local label = bucketUtils.capitalizeFirst(args.value)
                    local page = "Category:Quality: "..label
                    local res = "[[:"..page.."|"..label.."]]"
                    local qualityCategory = "[["..page.."]]"
                    local qualityCategory2 = qualityLcToCategoryMap[string.lower(args.value)] or ""
                    return res .. qualityCategory2 .. qualityCategory
                -- column: Count 
                elseif args.column == 2 then
                    return args.value or "1"
                end

                return args.value
            end

        local function postprocess(args)
                for _, row in ipairs(args.rows) do
                    if #row < 2 then
                        -- set 1 amount to columns where amount is not set. 1 is the default.
                        row[2] = 1
                    end
                end
            end

            resArgs[key] = tostring(bucketUtils.listToTableEl{
                caption = frame:preprocess("{{ui icon|quality|{{ui tooltip|Qualities|Specific characteristics of this item.}}}}"),
                headers = { "Quality", "Count" },
                rows = value,
                process = process,
                postprocess = postprocess
            })
        elseif key == "wearable_armor" then
            if value ~= 0 then
                resArgs.wearable_armor = value

                local damageReduction = 1 - 1 / (1 + value)
                local damageReductionFmted = frame:expandTemplate{ title = "ui icon", args = { "armor", bucketUtils.roundToDigit(damageReduction, 1) * 100 } }
                resArgs.damage_reduction = damageReductionFmted
            end
        elseif bucketUtils.startsWith(key, "sound") then
            format_sounds(frame, row, resArgs)
        else
            resArgs[key] = bucketUtils.paramValue(value)
        end
    end

    if DEBUG then 
        mw.log("> resArgs")
        mw.logObject(resArgs)
    end

    return frame:expandTemplate{ title = "Item Infobox", args = resArgs }
end

-- Renders N infoboxes. For debugging purposes.
function p.n_infoboxes(frame)
    local n = tonumber(frame.args.n) or 1
    local from = tonumber(frame.args.from) or 1

    local parent = mw.html.create("div")
        :css("display", "flex")
        :css("flex-direction", "row")
        :css("flex-wrap", "wrap")

    local queryRes = bucket("item")
        .select("item_id")
        .run()

    local total = #queryRes

    local count = 0
    for _, obj in ipairs(queryRes) do
        count = count + 1
        if count >= from then
            local itemId = obj.item_id
            frame.args[1] = itemId
            parent:node(p.infobox(frame))
        end

        if count == (from + n) then break end
    end

    return "Displaying " .. from .. " to " .. count .. " of " .. total, parent
end

function  p.progress_box(frame)
    local lang = Locale.resolveLang(frame)

    local items = bucket("item")
        .select("item_id")
        .run()

    local root = mw.html.create("div")
	    :css("display", "none")
    	:addClass("pbox-link-holder")
    for i, item in ipairs(items) do
        local itemId = item.item_id
    	local localeItem = Locale.getItem(itemId, lang)
        local displayName = localeItem and localeItem.name or itemId
    	
        root:wikitext("[["..(displayName).."|_]]")
    end
    return root
end

return p
