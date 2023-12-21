import { FunctionComponent, useCallback, useMemo } from "react"
import { FaEye } from "react-icons/fa"
import Hyperlink from "../../../components/Hyperlink"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { useSelectedItemViews } from "../SelectedItemViewsContext"

type Props = {
    // none
}

const SelectedNeurodataItemsWidget: FunctionComponent<Props> = () => {
    const {selectedItemViews} = useSelectedItemViews()
    const {openTab} = useNwbOpenTabs()
    const cc =  <span>View {selectedItemViews.length} {selectedItemViews.length === 1 ? 'item' : 'items'}</span>
    const handleOpenView = useCallback(() => {
        if (selectedItemViews.length === 1) {
            openTab(selectedItemViews[0])
        }
        else if (selectedItemViews.length > 1) {
            openTab(`neurodata-items:${selectedItemViews.join('@')}`)
        }
    }, [selectedItemViews, openTab])
    return (
        <div>
           {
                selectedItemViews.length > 0 ? (
                    <Hyperlink onClick={handleOpenView} title="Open view"><FaEye />&nbsp;{cc}</Hyperlink>
                ) : (
                    <span>No views selected</span>
                )
           }
           <SpecialPSTHButton
                selectedItemViews={selectedItemViews}
                openTab={openTab}
           />
        </div>
    )
}

type SpecialPSTHButtonProps = {
    selectedItemViews: string[]
    openTab: (path: string) => void
}

const SpecialPSTHButton: FunctionComponent<SpecialPSTHButtonProps> = ({selectedItemViews, openTab}) => {
    const {unitsSelectedItemPath, timeIntervalsSelectedItemPath} = useMemo(() => {
        if (selectedItemViews.length !== 2) return {
            unitsSelectedItem: undefined,
            timeIntervalsSelectedItem: undefined
        }
        const unitsSelectedItemPath = selectedItemViews.find(a => a.endsWith('|Units'))?.split('|')[0]?.split(':')[1]
        const timeIntervalsSelectedItemPath = selectedItemViews.find(a => a.endsWith('|TimeIntervals'))?.split('|')[0]?.split(':')[1]
        return {unitsSelectedItemPath, timeIntervalsSelectedItemPath}
    }, [selectedItemViews])
    const enabled = unitsSelectedItemPath && timeIntervalsSelectedItemPath
    if (!enabled) return <span />
    return (
        <div>
            <Hyperlink onClick={() => {
                if (!unitsSelectedItemPath) return
                if (!timeIntervalsSelectedItemPath) return
                openTab(`view:PSTH|${timeIntervalsSelectedItemPath}^${unitsSelectedItemPath}`)
            }}>Open PSTH for selected items</Hyperlink>
        </div>
    )
}

export default SelectedNeurodataItemsWidget