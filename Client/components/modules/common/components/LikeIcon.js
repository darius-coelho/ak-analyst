import React from 'react';

export function LikeIcon({isLiked=false, style={}, onClick=null, classname=''}) {
  if (isLiked) {
    return (
	<i className={`material-icons-sharp ${classname}`} style={style} onClick={onClick}>
      thumb_up
      </i>
    );
  }
  
  return (
      <i className={`material-icons-outlined ${classname}`} style={style} onClick={onClick}>
      thumb_up
      </i>
  );
}

export default LikeIcon;
