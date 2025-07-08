import React  from 'react';
import Axis   from './Axis';

export default class XYAxis extends React.Component {

  render(){
    const xSettings = {
      transform: `translate(0, ${this.props.height - this.props.padding})`,
      scale: this.props.xScale,
      orient: 'bottom',
      textAnchor: 'end'
    };
    const ySettings = {
      transform: `translate(${this.props.padding}, 0)`,
      scale: this.props.yScale,
      orient: 'left',
      textAnchor: 'middle'
    };
    return(
      <g className="xy-axis">
        <Axis
          {...xSettings}
          name={this.props.X}
          type={this.props.XType}
          txtX={this.props.width-this.props.padding}          
          txtY={40}
          txtFontSize={this.props.txtFontSize} />
        {
          this.props.yScale != null
          ? <Axis 
              {...ySettings}
              name={this.props.Y}
              type={this.props.YType}
              txtX={0}
              txtY={this.props.topPad ? this.props.topPad-10 : this.props.padding-10}              
              txtFontSize={this.props.txtFontSize} />
          : null
        }      
        
      </g>
    );
  }
}
