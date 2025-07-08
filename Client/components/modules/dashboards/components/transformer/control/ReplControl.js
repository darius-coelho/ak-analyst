import React, { useState, useEffect }  from 'react';
import Select from 'react-select';

/** Component which renders the category renaming control panel. */
export function ReplControl(props) {
  const { width, description } = props;

  // Set up state variables
  const [newName, setNewName] = useState("Other");
  const [searchVal, setsearchVal] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [categories, setCategories] = useState([{value: "<ALL>", label: "All Items"}].concat(
    description.division.map(
      (d, i) => ( 
        {value: d, label: d,  count: description.count[i]}
      )
    )))

  /**
   * Sets the name of the new category to the user specified name.
   * @param {object} evt - Event handler for tier input component.
   */
  const onNewNameChange = (event) => { setNewName(event.target.value); }
  
  /**
   * Updates the search string to search for categories.
   * @param {object} searchVal - Event handler for tier input component.
   * @param {object} flags - Object containing action type.
   */
  const onSearchChange = (searchVal, flags) => {    
    if(flags.action == "input-change"){
      let cats = categories
      cats[0].value = "<ALL>" + searchVal      
      setCategories(cats)
      setsearchVal(searchVal)
    }
    return searchVal
  } 
  
  /**
   * Updates the state variables to the new set of categories 
   * after adding a category to the current selection.
   * @param {list} selectedOptions - List of selected options.
   * @param {object} actionMeta - Object indicating the action taken.
   */
   const onSelectedCatsChange = (selectedOptions, actionMeta) => {     
    const { action, option, removedValue } = actionMeta;
    var substr = searchVal

    if(action === "select-option" && option.value === "<ALL>"+substr) {      
      var re = new RegExp(substr, 'i');            

      for(var i=0; i<categories.length; i++){        
        var item = selectedCats.find(c => c.value === categories[i].value)
        var inSel = (typeof item == 'undefined')
        if(categories[i].value.match(re) && inSel && categories[i].value !== "<ALL>"+substr){          
          selectedCats.push(categories[i])
        }        
      }
      props.onSelectCats(selectedCats.map((d) => d.value))
      setsearchVal("")
      setSelectedCats(selectedCats)
    } 
    else{
      props.onSelectCats(selectedOptions.map((d) => d.value))
      setSelectedCats(selectedOptions)
    }
  }

   /**
   * Updates the state variables when the props change
   * categories are reset to the new attributes categories
   */
   useEffect(() => {    
     const newCats = [{value: "<ALL>", label: "All Items"}].concat(
      props.description.division.map(
        (d, i) => ( 
          {value: d, label: d,  count: props.description.count[i]}
        )
      ))
      if(JSON.stringify(newCats) != JSON.stringify(categories)){
        setCategories(newCats)
      }      
  }, [props.description.division, setCategories])

  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    const transform = {
      tType: props.tType, 
      old_vals: selectedCats.map((d) => d.value),
      new_val: newName
    }
    props.onTransform(transform)
    props.onSelectCats([])
    setSelectedCats([])    
  }

  // Set Styles
  const nameInputStyle = {
    width: 170, 
    marginTop: 10, 
    marginRight: 5, 
    height: 38
  };

  const divStyle1 = {
    display: "inline-block",
    textAlign: 'left',
    verticalAlign: "top",
    width:200,
    marginRight: 5
  };

  const divStyle2 = {
    display: "inline-block",
    textAlign: 'left',
    verticalAlign: "top",
    width:width-200
  };

  const divStyle3 = {
    display: "block",
    width: width-200,
    marginTop: 10,
    textAlign:"left"
  };
  
  const labelStyle = {
    display: "inline-block", 
    verticalAlign:"middle"
  };

  return (
      <div style={{display: "block", paddingTop: 30}} >
        <div style={divStyle1}>
          <label style={{display: "block"}}>{"New Category Name:"}</label>
          <input 
            data-testid="repl-name"
            type="text" 
            className="coreTextInput" 
            style={nameInputStyle} 
            value={newName} 
            onChange={onNewNameChange} 
          />                                 
          <label style={labelStyle}>{"="}</label>
        </div>
        <div style={divStyle2}>
          <label style={{display: "block"}}>{"Categories to be merged:"}</label>
          <div style={divStyle3}>
            <Select
              defaultValue={[]}
              isMulti
              name="colors"
              options={categories}
              onChange={onSelectedCatsChange}
              onInputChange={onSearchChange}
              value={selectedCats}
              className="selectCats"
              classNamePrefix="selectCats"
            />
          </div>       
        </div>      
        <input 
          type="button" 
          className="coreButton" 
          style={{display: 'block', margin: "auto", marginTop: 20}} 
          onClick={onApply} 
          value={"Apply"}
        />
      </div>
  );
}

export default ReplControl;
