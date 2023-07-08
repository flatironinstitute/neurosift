import { FunctionComponent, useCallback } from "react"
import { FaEye } from "react-icons/fa"
import Hyperlink from "../../../components/Hyperlink"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { useSelectedNwbItems } from "../SelectedNwbItemsContext"

type Props = {
    // none
}

const SelectedNeurodataItemsWidget: FunctionComponent<Props> = () => {
    const {selectedNwbItems} = useSelectedNwbItems()
    const {openTab} = useNwbOpenTabs()
    const cc =  <span>View {selectedNwbItems.length} {selectedNwbItems.length === 1 ? 'item' : 'items'}</span>
    const handleOpenView = useCallback(() => {
        if (selectedNwbItems.length === 1) {
            const item = selectedNwbItems[0]
            openTab(`neurodata-item:${item.path}|${item.neurodataType}`)
        }
        else if (selectedNwbItems.length > 1) {
            openTab(`neurodata-items:${selectedNwbItems.map(item => `${item.path}|${item.neurodataType}`).join('@')}`)
        }
    }, [selectedNwbItems, openTab])
    return (
        <div>
           {
                selectedNwbItems.length > 0 ? (
                    <Hyperlink onClick={handleOpenView} title="Open view"><FaEye />&nbsp;{cc}</Hyperlink>
                ) : (
                    <span>No views selected</span>
                )
           }
        </div>
    )
}

export default SelectedNeurodataItemsWidget