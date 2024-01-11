import {useState} from 'react'
import '../constants.css'
import './Tile.css'
import BackendUtils from "../backend/BackendUtils";
const Tile = (props) => {
    const [backgroundColor, setBackgroundColor] = useState(props.color === 'white' ? 'wheat' : 'dimgray')
    const styles={
        backgroundColor: backgroundColor
    }
    const clicked = () => {
        props.highlightTile(props.coords)
    }

    const isPieceDefined = () =>{
        return props.piece !== undefined && props.piece !== 'x'
    }

    let classname = 'tile';

    if(props.highlight === true) classname = classname + ' highlight'

    return (
        isPieceDefined()
            ?
            <div onClick={clicked} className={classname} style={styles}>
                <img className='piece' src={'./imgs/' + BackendUtils.convertToPieceName(props.piece) + '.svg'} draggable='false'/>
            </div>
            :
            <div onClick={clicked} className={classname} style={styles}>
            </div>
    )
}

export default Tile