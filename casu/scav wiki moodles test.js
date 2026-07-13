(() => {
    const dataTables = document.querySelectorAll('.mw-parser-output > table');
    
    const data = []
    for(const table of dataTables) {
        const tableData = {
            items: []
        }
        data.push(tableData);

        for(const row of table.querySelectorAll('tr:has(td)')) {
            const rowData = {
                moodle: row.children[0].innerHTML,
                description: row.children[1].innerHTML
            }
            tableData.items.push(rowData);
        }
    }

    for(const [tableIdx, table] of dataTables.entries()) {
        const items = data[tableIdx].items;

        table.innerHTML = "";
        table.classList.add("fluff");

        const moodlesRow = document.createElement('tr');
        const descriptionsContainer = document.createElement('div');
        descriptionsContainer.classList.add("descriptions")
        let selected = null;
        for(const [itemIdx, item] of items.entries()) {
            const moodleCell = document.createElement('th');
            moodlesRow.append(moodleCell);
            const moodleEl = document.createElement('button');
            moodleEl.classList.add("moodle-btn")
            moodleEl.innerHTML = item.moodle;
            moodleEl.addEventListener('click', () => {
                if(selected)
                    selected.classList.remove('selected');
                selected = moodleEl;
                moodleEl.classList.add('selected');

                const scrollToPos = descriptionsContainer.scrollWidth / moodlesRow.children.length * itemIdx;
                descriptionsContainer.scrollTo({ left: scrollToPos });
            })
            moodleCell.append(moodleEl)

            if(!selected) {
                moodleEl.click();
            }
                        
            const descEl = document.createElement('div');
            descEl.innerHTML = item.description;
            descriptionsContainer.append(descEl);
        }
        
        table.append(moodlesRow);
        
        const descRow = document.createElement('tr');
        table.append(descRow);
        const descCell = document.createElement('td');
        descCell.setAttribute('colspan', moodlesRow.children.length);
        descRow.append(descCell);

        descCell.append(descriptionsContainer);
    }

    const styles = `\
.fluff {
    box-sizing: border-box !important;;
    
    & * {
        box-sizing: border-box !important;;
    }
    
    & .descriptions {
        display: flex;
        overflow: hidden;
        scroll-snap-type: x mandatory;

        & > div {
            flex: 0 0 100%;
            scroll-snap-align: start;
        }
    }

    /* moodle cell */
    & th {
        padding: 0 !important;
        margin: 0 !important;
        width: 25%;
    }
    & .moodle-btn {
        all: unset;
        padding: 0.4rem;
        width: 100%;
        height: 100%;
        cursor: pointer;

        &.selected {
            background-color: hsl(0, 0%, 100%, 0.2);
        }

        &:hover {
            background-color: hsl(0, 0%, 100%, 0.1);
        }

        & * {
            user-select: none;
            pointer-events: none;
        }
    }
}
    `
    
    addCss(styles);


    function addCss(str) {
        const el = document.createElement('style');
        el.innerHTML = str;
        document.head.append(el);
    }
})();