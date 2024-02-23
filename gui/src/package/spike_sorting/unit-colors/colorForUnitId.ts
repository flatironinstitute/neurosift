import colorList from "./colorList"

const colorForUnitId = (unitId: number) => {
    return colorList[unitId % colorList.length]
}

export default colorForUnitId