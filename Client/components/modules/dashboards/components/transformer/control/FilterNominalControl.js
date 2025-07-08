import React, { useState, useEffect }  from 'react';
import Select from 'react-select';

/** Component which renders the category filtering control panel. */
export function FilterNominalControl(props) {
  const { width, description } = props;

  // Set up state variables
  const [filterType, setFilterType] = useState("Include");
  const [searchVal, setsearchVal] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [categories, setCategories] = useState([{value: "<ALL>", label: "All Items"}].concat(
    description.division.map(
      (d, i) => ( 
        {value: d, label: d,  count: description.count[i]}
      )
  )))

  // Update state when categories changed
  useEffect(() => {
    setFilterType("Include")
    setsearchVal("")
    setSelectedCats([])
    setCategories(
      [{value: "<ALL>", label: "All Items"}].concat(
        description.division.map(
          (d, i) => ( 
            {value: d, label: d,  count: description.count[i]}
          )
      ))
    )
  }, [description])
  
  /**
   * Sets the the filter type to include or exclude.
   * @param {object} selectedOption - Event handler for tier input component.
   */
  const onFilterTypeChange = (selectedOption) => { setFilterType(selectedOption.value); }
  
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
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    const transform = {
      tType: props.tType, 
      filter_type: filterType,
      filter_cats: selectedCats.map((d) => d.value),      
    }
    props.onTransform(transform)
    props.onSelectCats([])
    setSelectedCats([])    
    setFilterType("Include")
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

  const customStyles = {
    control: base => ({
      ...base,    
      overflow: "auto",  
      maxHeight: 80
    })
  };
    
  return (
      <div style={{display: "block", paddingTop: 30}} >
        <div style={divStyle1}>
          <label style={{display: "block"}}>{"Filter Type:"}</label>
          <div style={nameInputStyle}>
            <Select              
              value={{value: filterType, label: filterType}}
              isMulti={false}
              onChange={onFilterTypeChange}
              options={[{value: "Include", label: "Include"},
	  		        {value: "Exclude", label: "Exclude"}]} 
              className="selectType"
              classNamePrefix="selectType"
            />
          </div>
        </div>
        <div style={divStyle2}>
          <label style={{display: "block"}}>{"Categories to filter by:"}</label>
          <div style={divStyle3}>
            <Select
              data-testid="select-filter-cats"
              defaultValue={[]}
              isMulti
              name="colors"
              options={categories}
              onChange={onSelectedCatsChange}
              onInputChange={onSearchChange}
              value={selectedCats}
              styles={customStyles}
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

export default FilterNominalControl;
