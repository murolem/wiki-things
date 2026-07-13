local assert = require("Module:Assert")
local yesNo = require("Module:Yesno")

local p = {}

-- =================================================

---Generate an error message for type mismatch.
---@param argName string Argument name.
---@param expectedType type Expected argument type.
---@param actualValue unknown Actual value of the argument.
---@return string String Message.
local function genAssertTypeErrorMessage(argName, expectedType, actualValue)
    return "expected '"..argName.."' to be of type '"..expectedType"', but found '"..type(actualValue).."'"
end

-- ==================#############==================
-- ==================# UTILITIES #==================
-- ==================#############==================

---Merge two tables. Duplicate properties are replaced.
---@param tblInto table Table to merge into.
---@param tblFrom table Table to merge from.
---@return table Table The "merge into" table.
function p.merge(tblInto, tblFrom)
    assert.isTable(tblInto, genAssertTypeErrorMessage("tblInto", "table", tblInto))
    assert.isTable(tblFrom, genAssertTypeErrorMessage("tblFrom", "table", tblFrom))

    for k, v in pairs(tblFrom) do 
        tblInto[k] = v 
    end

    return tblInto
end

---Returns first row from bucket query or `nil`, if query failed.
---@param result unknown First row from bucket query. 
---@return (unknown | nil) Result
function p.firstRow(result)
    return result and result[1] or nil
end

---Capitalizes first character.
---@param str string String.
---@return string String.
function p.capitalizeFirst(str)
    return (str:gsub("^%l", string.upper))
end

---Reduce array table into a new table.
---@param tbl table Table to reduce.
---@param reduceFn function Reducing function.
---@param reduceFn.accum unknown Accumulator.
---@param reduceFn.value any Value.
---@param reduceFn.index any Index.
---@param reduceFn.tbl table Original table.
---@param initialValue unknown Initial value of the accumulator.
---@return table Table Final value of the accumulator.
function p.reduceArrayTable(tbl, reduceFn, initialValue)
    local accum = initialValue

    for i, v in ipairs(tbl) do
        reduceFn(accum, v, i, tbl)
    end

    return accum
end

---Map array table into a new table.
---@param tbl table Table to map.
---@param mapFn function Mapping function.
---@param mapFn.value unknown Value.
---@param mapFn.index unknown Index.
---@param mapFn.tbl table Original table.
---@return table Table A new table containing mapped values.
function p.mapArrayTable(tbl, mapFn)
    local res = {}
    for i, v in ipairs(tbl) do
        table.insert(res, mapFn(v, i, tbl))
    end
    return res
end

---Map dictionary table into a new table.
---@param tbl table Table to map.
---@param mapFn function Mapping function.
---@param mapFn.value unknown Value.
---@param mapFn.key unknown Key.
---@param mapFn.tbl table Original table.
---@return table Table A new table containing mapped values.
function p.mapTable(tbl, mapFn)
    local res = {}
    for k, v in pairs(tbl) do
        table.insert(res, mapFn(v, k, tbl))
    end
    return res
end

---Round number.
---@param num number
---@return integer Result
function p.round(num)
    return math.floor(num + 0.5)
end

---Round number to given digit.
---@param num number Number.
---@return integer Result
function p.roundToDigit(num, digits)
    --[[
    round a number to so-many decimal of places, which can be negative, 
    e.g. -1 places rounds to 10's,  
    
    examples
        173.2562 rounded to 0 dps is 173.0
        173.2562 rounded to 2 dps is 173.26
        173.2562 rounded to -1 dps is 170.0
    ]]--
    local mult = 10^(digits or 0)
    return math.floor(num * mult + 0.5)/mult
end

-- ===============####################===============
-- ===============# SHARED FUNCTIONS #===============
-- ===============####################===============

---Parses a bucket value into a string suitable for outputting into a page (by returning, passing into `frame:expandTemplate` args, or etc).
---@param value unknown Value.
---@return string Result
function p.paramValue(value)
    if value == nil then return "" end
    if type(value) == "boolean" then
        return yesNo(value) and "true" or "false"
    end
    if type(value) == "table" then
        return table.concat(value, ", ")
    end
    return tostring(value)
end

--- Converts list array props `{ "prop1:prop2:propN", "prop1:prop2:propN"  }` to table html elements, suitable for outputting onto a page.
--- @param args table Args.
--- @param args.caption string Optional table caption. Example: `"Contents"`
--- @param args.headers table Optional table headers. Example: `{ "Substance", "Amount (mL)" }`
--- @param args.rows table Required table rows. Each row is expected to be separated with a delimiter. Example: `{ "epinephrine:15", "oxyline:25" }`
--- @param args.delimiter string Optional delimiter. `":"` by default. Example: `":"`
--- @param args.process function Optional processing function. Called on each cell.
--- @param args.process.args table `process` function args.
--- @param args.process.args.column number Column. Begins with 1.
--- @param args.process.args.value string Cell value.
--- @param args.process.args.rowsCount number Amount of rows the table has in total.
--- @param args.postprocess function Optional post-processing function. Called once after the table is processed.
--- @param args.postprocess.args table `postprocess` function args.
--- @param args.postprocess.args.rows table Processed rows. Each row is a table with values of either string or any other type resulting from the processing step.
--- @return unknown element HTML element.
function p.listToTableEl(args)
    assert.notNil(args.rows, "'rows' was not provided")
    args.delimiter = args.delimiter or ":"

    local containerEl = mw.html.create("table")

    if args.caption then containerEl:tag("caption"):wikitext(args.caption) end

    if args.headers then
        local headRow = containerEl:tag("tr")
        for _, item in ipairs(args.headers) do
            headRow:tag("th"):wikitext(item)
        end
    end

    local rows = {}

    -- process rows
    for _, item in ipairs(args.rows) do
        local row = {}
        for column, value in ipairs(mw.text.split(item, args.delimiter, true)) do
            if args.process then
                value = args.process{
                    column = column,
                    value = value,
                    rowsCount = #args.rows
                }
            end

            table.insert(row, value)
        end
        table.insert(rows, row)
    end

    -- postprocess rows
    if args.postprocess then
        args.postprocess{
            rows = rows
        }
    end

    -- generate row elements
    for _, row in ipairs(rows) do
        local rowEl = containerEl:tag("tr")
        for _, value in ipairs(row) do
            rowEl:tag("td"):wikitext(value)
        end
    end

    return containerEl
end