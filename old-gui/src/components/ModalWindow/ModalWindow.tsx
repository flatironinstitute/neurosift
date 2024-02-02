import { Close } from '@mui/icons-material';
import { Dialog, IconButton } from '@mui/material';
import { FunctionComponent, PropsWithChildren } from 'react';

type Props = {
    open: boolean
    onClose?: () => void
}

const ModalWindow: FunctionComponent<PropsWithChildren<Props>> = ({ onClose, open, children }) => {
    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            style={{
                zIndex: 9999,
                left: 100,
                top: 100,
                right: 100,
                bottom: 100,
                background: 'white',
                position: 'absolute',
                border: '2px solid #000',
                overflow: 'auto'
            }}
        >
            <div style={{zIndex: 9999, padding: 20}}>
                {
                    onClose && <IconButton onClick={onClose}><Close /></IconButton>
                }
                {
                    children
                }
            </div>
        </Dialog>
    )
}

export default ModalWindow