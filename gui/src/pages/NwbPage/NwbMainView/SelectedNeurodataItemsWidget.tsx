import { FunctionComponent, useCallback } from "react"
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
        </div>
    )
}

export default SelectedNeurodataItemsWidget