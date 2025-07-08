import React from 'react';
import "../../../../../css/Core.css"
import "../css/Transformer.css"

export default class CardinalityNotification extends React.Component {
  state={    
    expand: false,    
    name: this.props.description.name
  }

  static getDerivedStateFromProps(props, state) {
    if(props.description.name != state.name){
      return {
        expand: false,  
        name: props.description.name
      }
    }
    return null
  }


  onExpand(){
    var expand = !this.state.expand
    this.props.setTransformType("Repl")
    this.setState({expand: expand})
  }

  render() {
    if(!this.props.hasCard || (this.props.type!="Nominal" && this.props.type!="Ordinal")){
      return null
    }     
    var buttonStyle = {position: "absolute", right: 5, margin: 10}
    return (
      <div className="listInnerItem">
        <button className="coreButton"  style={buttonStyle} onClick={this.onExpand.bind(this)} >
          {"Resolve"}
        </button>
        <div style={{ display: "inline-block", margin: 10, verticalAlign: "middle", cursor:"default"}}>
          <i className="material-icons-round" style={{position: "absolute", color: "#000000"}}>
            warning_amber
          </i>
          <i className="material-icons-round" style={{color: "#ebfb00"}}>
            warning
          </i>
        </div>
        <label className="listLabel">
          {"High cardinality(" + this.props.card + ") detected."}
        </label>
        
        {
          this.state.expand
          ? <div style={{margin: 10, pad: 5, textAlign: "justify"}}>
              {"Reduce cardinality by grouping categories into a new category in the panel on the left."}
            </div>              
          : null
        }
      </div>    
    );
  }
}
