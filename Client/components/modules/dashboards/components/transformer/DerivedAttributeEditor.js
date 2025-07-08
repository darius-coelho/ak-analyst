import React from 'react';

import HelpIcon from '../../../common/components/HelpIcon';

import "../../../../css/Core.css"
import "../../../../css/Modal.css"

export default class DerivedAttributeEditor extends React.Component {

  state={
    customPy: "",
    derivedName: "new_derived"
  }

  onCustomChange(event){
    this.setState({customPy: event.target.value})
  }

  onApply(){
    this.props.onDeriveAttribute({
      tType: 'Derived',
      attr: this.state.derivedName,
      expr: this.state.customPy
    })
  }

  onChangeDerivedName(event){
    this.setState({derivedName: event.target.value})
  }

  render() {
    if(!this.props.show){
      return null
    }   
    var nameInputStyle = {width: 130}
    var nameDivStlye = {display: "inline-block", verticalAlign: "top", width:175, marginTop: 20}
    var cmdInputStyle = {width: 430, height: 75}
    var cmdDivStlye = {display: "inline-block", verticalAlign: "top", width:430, marginTop: 20}
    var cmdDefaultText = `x + y \nx[x<10] = x[x<10] + y[x<10]\nHere x and y are attribute names`
    return(
      <div className="ak-modal" style={{top: this.props.top, left: this.props.left, width: this.props.width, height: this.props.height, display:"block"}}>
        <div className="ak-modal-content" >
          <label className="contentDivHead" title={"Derived Attribute Creator"}>Derived Attribute Creator</label> 
          <HelpIcon 
            content={
              `This dialog box allows you to create a derived attribute. 
              You can set the name of the new attribute with the text box on the left 
              and write an expression into the text box on the right to create the derived attributes data. `
            }
          />
          <div style={nameDivStlye}>
            <label style={{display: "block", marginLeft: 10 }}>
              {"Name: "}
            </label>
            <input 
              type="text" 
              className="coreTextInput" 
              style={nameInputStyle} 
              value={this.state.derivedName} 
              onChange={this.onChangeDerivedName.bind(this)} 
            />                                 
            <label>{"="}</label>
          </div>
          <div style={cmdDivStlye}>
            <label style={{display: "block", marginLeft: 10}}>
              {"Enter custom python operation:"}
            </label>
            <textarea 
              className="coreTextInput" 
              placeholder={cmdDefaultText} 
              style={cmdInputStyle} 
              value={this.state.customPy} 
              onChange={this.onCustomChange.bind(this)} />               
          </div>
          <div style={{textAlign: "center", width:"100%"}}>
            <input 
              type="button" 
              className="coreButton" 
              onClick={this.onApply.bind(this)} 
              value={"Apply"} 
            />
            <input 
              type="button" 
              className="coreButton" 
              onClick={this.props.onCancel} 
              value={"Cancel"} 
            />
          </div>
        </div>            
      </div>
    )
  }
}
