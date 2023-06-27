import { FunctionComponent, PropsWithChildren, useRef, useState } from "react";
import ReactVisibilitySensor from "react-visibility-sensor";

type Props ={
	width: number
	height: number
}

const IfHasBeenVisible: FunctionComponent<PropsWithChildren<Props>> = ({children, width, height}) => {
	const hasBeenVisible = useRef(false)
	return (
		<div style={{position: 'relative', width, height}}>
			<ReactVisibilitySensor partialVisibility={true}>
				{({isVisible}: {isVisible: boolean}) => {
					if ((isVisible) || (hasBeenVisible.current)) {
						hasBeenVisible.current = true
						return children
					} else {
						return <span>Not visible</span>
					}
				}}
			</ReactVisibilitySensor>
		</div>
	)
}

export default IfHasBeenVisible
