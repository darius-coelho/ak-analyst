export const SET_PIPELINE_NAME = 'global/SET_PIPELINE_NAME';
export const SET_AUTOSAVE_NAME = 'global/SET_AUTOSAVE_NAME';
export const RESET_STATE = 'global/RESET_STATE';
export const SET_SAMPLE_STATUS = 'global/SET_SAMPLE_STATUS';
export const SET_IS_SAVED = 'global/SET_IS_SAVED';

export const setPipelineName = (name) => {
  return {
    type: SET_PIPELINE_NAME,
    name
  };
};

export const setAutoSaveName = (name) => {
  return {
    type: SET_AUTOSAVE_NAME,
    name
  };
};

/** Resets the global state with a new pipeline name. */
export const resetGlobalState = (name='') => {
  return {
    type: RESET_STATE,
    name
  };
}

/** Sets whether the current pipeline is a sample pipeline. */
export const setSampleStatus = (isSample) => {
  return {
    type: SET_SAMPLE_STATUS,
    isSample
  };
}

/** 
 * Sets a flag indicating if the saved pipeline matches
 * the current pipeline (i.e. it is up to date).
 */
export const setIsSaved = (isSaved) => {
  return {
    type: SET_IS_SAVED,
    isSaved
  };
}
