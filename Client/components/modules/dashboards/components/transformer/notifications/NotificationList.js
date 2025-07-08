import React from 'react';

import CorrelatedNotification from './CorrelatedNotification'
import CardinalityNotification from './CardinalityNotification'
import MissingNotification from './MissingNotification';
import SingleUniqueNotification from './SingleUniqueNotification';

/**
 * Renders a list of notifications for an attribute.
 * @param {boolean} showTransforms - A flag that indicates if the transform list will be shown belows this component.
 * @param {object} description - The description of an atttribute as recieved from the backend transformer.
 * @param {array} data - A sample of the data being transformed for correlation plots.
 * @param {array} dataCount - The number of rows in the dataset.
 * @param {string} deleted - A list of deleted attributes.
 * @param {number} width - Width in pixels for the notification list.
 * @param {number} height - Height in pixels for the notification list.
 * @param {function} onChangeReplacement - The function that calls a replace missing value transform.
 * @param {function} onDelete - The function that deletes an attributes.
 * @param {function} setTransformType - The function that changes the selected transform type.
 * @param {function} onJumpTo - The function that changes the selected attribute.
 */
export function NotificationList(props) {

  const { showTransforms, width, height, description, attrTypes, orderings, data, dataCount, deleted,
    onChangeReplacement, onDelete, setTransformType, onJumpTo } = props;

  const divStyle = {
    top: 50,
    left: 0.55*(width) + 5,
    width: 0.45*(width) - 10,
    height: showTransforms ? height - height/2 : height - 85 ,
    borderLeft: "1px solid #a1a1a1"
  }

  return (
    <div className="contentInnerdiv" style={divStyle}>
      <label className="contentDivSubHead">{"Notifications:"}</label>

      <MissingNotification
        dType={description.type}
        hasMiss={description.hasMiss}
        missingCount={description.countMiss}
        dataCount={dataCount}
        onChangeReplacement={onChangeReplacement} />

      <SingleUniqueNotification
        description={description}
        onDelete={onDelete} />             
              
      <CorrelatedNotification
        type={"Collinear"}
        hasCorr={description.coll.length > 0}
        attr={description.name}
        corr={description.coll}
        attrTypes={attrTypes}
        orderings={orderings}
        data={data}
        deleted={deleted}
        onJumpTo={onJumpTo}
        onDelete={onDelete}
        width={0.45*(width) - 30} />
        
      <CorrelatedNotification
        type={"Correlated"}
        hasCorr={description.corr.length > 0}
        attr={description.name}
        corr={description.corr}
        attrTypes={attrTypes}
        orderings={orderings}
        data={data}
        deleted={deleted}
        onJumpTo={onJumpTo}
        onDelete={onDelete}
        width={0.45*(width) - 30} />

      <CardinalityNotification
        type={description.type}
        hasCard={description.hasHighCard}
        card={description.card}
        description={description}
        width={0.45*(width) - 30}
        setTransformType={setTransformType} />
    </div>
  );
}

export default NotificationList;
