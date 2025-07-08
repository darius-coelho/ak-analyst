import { SET_PIPELINE_NAME, SET_AUTOSAVE_NAME, RESET_STATE,
	 SET_SAMPLE_STATUS, SET_IS_SAVED } from  './global.actions';

const initialState = {
  pipelineName: '',
  autoSaveName: '',
  isSample: false,

  // True if the saved pipeline is up to date.
  // False o.w. (i.e. false indicates unsaved changes)
  isSaved: true,
};

/** Reducer handling changes to the global state (e.g. pipeline name, save status, etc.) */
export const globalReducer = (state=initialState, action) => {
  switch(action.type) {
    case SET_PIPELINE_NAME: return {
      ...state,
      pipelineName: action.name
    }
    case SET_AUTOSAVE_NAME: return {
      ...state,
      autoSaveName: action.name
    }
    case RESET_STATE: return {
      ...initialState,
      pipelineName: action.name
    }
    case SET_SAMPLE_STATUS: return {
      ...state,
      isSample: action.isSample
    }
    case SET_IS_SAVED: return {
      ...state,
      isSaved: action.isSaved
    }
    default: return state
  }
}

export default globalReducer;
