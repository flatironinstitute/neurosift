import { FunctionComponent, PropsWithChildren } from "react";
import ReactVisibilitySensor from "react-visibility-sensor";

type Props ={
	width: number
	height: number
}

const IfVisible: FunctionComponent<PropsWithChildren<Props>> = ({children, width, height}) => {
	return (
		<div style={{position: 'relative', width, height}}>
			<ReactVisibilitySensor partialVisibility={true}>
				{({isVisible}: {isVisible: boolean}) => {
					if (isVisible) {
						return children
					} else {
						return <span>Not visible</span>
					}
				}}
			</ReactVisibilitySensor>
		</div>
	)
}

export default IfVisible
