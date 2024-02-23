export const sortIds = (ids: (string | number)[]) => {
    // Handle cases:
    //    1, 2, 3, ... These are numbers
    //    A1, A2, A3, ..., A10, A11, B1, B2, B3, ... Note: A2 comes before A10
    //    axyz, bxyz, bzzz, ... These are strings

    return [...ids].sort((id1, id2) => {
        if ((typeof(id1) === 'number') && (typeof(id2) === 'number')) {
            return id1 - id2
        }
        else {
            if ((!isNaN(parseInt(id1 + ''))) && (!isNaN(parseInt(id2 + '')))) {
                return parseInt(id1 + '') - parseInt(id2 + '')
            }
            const firstChar1 = (id1 + '')[0]
            const firstChar2 = (id2 + '')[0]
            if (firstChar1 === firstChar2) {
                const s1 = (id1 + '').slice(1)
                const s2 = (id2 + '').slice(1)
                if ((!isNaN(parseInt(s1))) && (!isNaN(parseInt(s2)))) {
                    return parseInt(s1) - parseInt(s2)
                }
                else return id1 < id2 ? -1 : id1 > id2 ? 1 : 0
            }
            else return id1 < id2 ? -1 : id1 > id2 ? 1 : 0
        }
    })
}