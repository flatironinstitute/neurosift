import React, { FunctionComponent, PropsWithChildren, useMemo } from 'react';

type Props = {
    width: number
    height: number
    disableScroll?: boolean
}

const VerticalScrollView: FunctionComponent<PropsWithChildren<Props>> = ({width, height, children, disableScroll}) => {
    const divStyle: React.CSSProperties = useMemo(() => ({
        width: width - 20, // leave room for the scrollbar
        height,
        position: 'relative',
        overflowY: !disableScroll ? 'auto' : 'hidden'
    }), [width, height, disableScroll])
    return (
        <div style={divStyle}>
            {children}
        </div>
    )
}

export default VerticalScrollView