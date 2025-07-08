import React, { useState, useEffect } from 'react';

export function AttrRenameControl(props) {
  const { name, onRename } = props;

  const [newName, setNewName] = useState(name)

  useEffect(() => {        
    setNewName(name)      
  }, [name, setNewName])
  
  /**
   * Sets temporary name for the attribute until it is applied.
   * @param {object} evt - Input event object.
   */
  const onChangeNewName = (evt) => setNewName(evt.target.value)
  
  return (
    <div>
      <label className='attrDetailLabel'>{"Name: "}</label>
      <div className='attrDetailBox'>
        <input 
          type="text" 
          className="coreTextInput"  
          value={newName} 
          style={{margin: 0, width: "15em"}}
          onChange={onChangeNewName}
        />     
        {
          name != newName
            ? <button className="coreButtonSmall" disabled={newName == ''} style={{marginTop: 0}} onClick={() => onRename(newName)}>
              {"Set Name"}
            </button>                  
          : null
        }
      </div>
    </div>
  );
}

export default AttrRenameControl;
