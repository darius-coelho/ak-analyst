import React from 'react';

/** 
 * Helper for rendering tables.
 * @param {json} output - JSON containing a label and value.
 */
function TableValues(props) {
  const { output } = props;
  const keys = ['R^2', 'MSE', 'RMSE', 'Accuracy', 'AUC'];
  return keys.filter(name=>name in output).map((name, ni)=>{
    return (
	<div key={`name-${ni}`} className='tableRow' >
        <label className='labelCell'>{name} </label>
        <label className='valueCell'>{output[name].toFixed(3)}</label>
        </div>
    );
  });
}


/** 
 * Renders a confusion matrix.
 * @param {array} confusion - List of lists containing confusion matrix values.
 */
function ConfusionMatrix(props) { 
  const { confusion } = props;

  return confusion.map((row, ri)=>{
    return (
	<div key={`row-${ri}`} className='tableRow' >
	{
	  row.map((col, ci)=>{
	    return (
		<label key={`col-${ci}`}
	          className="valueCell"
	          style={{textAlign: 'center'}}>
		  {col}
	        </label>
	    );
	  })
	}
      </div>
    );
  });
}

/** 
 * Renders information regarding the accuracy of a given model.
 * @param {json} output - Response from executing a pipeline.
 * @param {bool} isTrain - If true, then is from training data.
 */
export function ErrorReportOutput(props) {
  const { output, isTrain } = props;

  const divStyle = {
    top:  85,
    left: 10,
    width: "calc(100% - 25px)",
    height: "calc(100% - 90px)",
    overflow: 'auto',
    zIndex: 0
  }

  const itemCountTitle = (
    isTrain
      ? `${output.itemCount} data items were used for training.`
      : `${output.itemCount} data items were used for prediction.`
  );
  
  return (
      <div className="contentInnerdiv" style={divStyle}>
        <div className='tableContainer'>
          <div className='tableHead'>Data Properties</div>
          <div 
            className='tableRow'
            title={itemCountTitle}
            >
              <label className='labelCell'>
                {"Item Count"}
              </label>
              <label className='valueCell'>
                {output.itemCount}
              </label>
          </div>
          
          <div
            className='tableRow'
            title={`${output.featureCount - 1} attributes.`}
            >
              <label className='labelCell'>
                {"Feature Count"}
              </label>
              <label className='valueCell'>
                {output.featureCount - 1}
              </label>              
          </div>
        </div>
        <div className='tableContainer'>
          <div className='tableHead'>{`${output.model_name} Accuracy`}</div>
          <TableValues output={output.error} />      
        </div>
        {
            'confusion' in output.error
            ? (
                <div className='tableContainer'>
                  <div className='tableHead'>Confusion Matrix</div>
                  <ConfusionMatrix confusion={output.error.confusion} />
                </div>
              )
            : null
        }
      </div>
  );
}

export default ErrorReportOutput;
