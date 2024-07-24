import { FunctionComponent } from "react";

type Props = {
    userId: string | undefined
    color?: string
}

const UserIdComponent: FunctionComponent<Props> = ({ userId, color }) => {
    const x = userId ? (userId.startsWith('github|') ? userId.slice('github|'.length) : userId) : ''
    return <span style={{color: color || '#345', fontStyle: 'italic', textDecoration: 'underline'}}>{x}</span>
}

export default UserIdComponent