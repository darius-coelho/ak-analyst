import React from "react";
import { HashRouter, Route, Switch, useLocation, useHistory } from 'react-router-dom';

import NaviBarMain from "./modules/common/components/NaviBarMain";
import NaviBarLanding from "../electron/src/NaviBarLanding";

import { ConfirmDialog } from "./modules/common/components/ConfirmDialog";
import { ErrorBoundary } from 'react-error-boundary';

import Transformer from "./modules/dashboards/components/transformer/Transformer"
import Main from "./modules/dashboards/components/main/Main"
import ProjectLoad from "./modules/dashboards/components/landing/ProjectLoad";
import PatternBrowserBubble from './modules/dashboards/components/pattern_browser/PatternBrowser';
import PatternBrowserCard from "./modules/dashboards/components/patternBrowserCard/PatternBrowserCard";
import CausalExplorer from "./modules/dashboards/components/causal_explorer/CasualExplorer";
import FeatureExplorer from './modules/dashboards/components/feature_explorer/FeatureExplorer';
import Visualizer from "./modules/dashboards/components/visualizer/Visualizer";

import axios from "axios"
import io from 'socket.io-client';
import { Provider } from 'react-redux';

import AddressContext from "./AddressContext";
import { InfoToastContextProvider, useInfoToastContext } from "./modules/common/components/InfoToastContext";
import { setPipelineName, setAutoSaveName, setSampleStatus } from "./modules/global/global.actions";
import { resetState, setStateFromFile, setIsFileAvailable } from "./modules/graph/graph.actions";
import { resetGlobalState } from './modules/global/global.actions';
import { selectNodes } from "./modules/graph/graph.selectors"
import { store } from './modules/store'
import api from '../apis/api';

import "./css/Spinners.css"
import "./css/NavBar.css"

import mixpanel from 'mixpanel-browser';

api.init(document.location.origin + '/');

// Wrapper for Transformer component
function CleanseLayout(props) {
  const location = useLocation();
  return <Transformer {...location.state} />
}

// Wrapper for causal explorer component
function CausalExplorerLayout(props) {
  const location = useLocation();
  return <CausalExplorer {...location.state} />
}

// Wrapper for pattern browser bubble layout component
function PatternBrowserBubbleLayout(props) {
  const location = useLocation();
  return <PatternBrowserBubble {...location.state} />
}

// Wrapper for pattern browser card layout component
function PatternBrowserCardLayout(props) {
  const location = useLocation();
  return <PatternBrowserCard {...location.state} />
}

// Wrapper for feature explorer component
function FeatureExplorerLayout(props) {
  const location = useLocation();
  return <FeatureExplorer {...location.state} />
}

// Wrapper for visualizer component
function VisualizerLayout(props) {
  const location = useLocation();
  return <Visualizer {...location.state} />
}

function ErrorFallback({ error, resetErrorBoundary }) {
  const history = useHistory();
  const location = useLocation();
  const addInfoToast = useInfoToastContext();

  function reset() {
    resetErrorBoundary();
    if (location.pathname !== "/main") {
      // go back to main
      history.push({ pathname: "/main" });
    } else {
      // go back to the landing page
      history.push({ pathname: "/" });
    }
  }

  const errorStyle = {
    textAlign: 'center',
    paddingTop: "20%"
  };

  addInfoToast(error.message, "danger")

  return (
    <div role="alert" style={errorStyle}>
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={reset}>Try again</button>      
    </div>
  )
}


export default class Layout extends React.Component {
  state = {
    srvStatus: 500,
    address: document.location.origin + '/',
    socket: null,
    isReady: false
  }

  componentDidMount() {
    if (process.env.DEV) { console.log("Development Mode") }
    if (this.props.isWeb) {
      this.getStatus()
    } else {
      this.props.startExe(5000, 5100,
        this.getStatus.bind(this),
        this.setState.bind(this));
    }
  }

  /**
   * Polls the server to check if it is ready
   */
  getStatus() {
    let status = 500
    var getStatus = this.getStatus.bind(this)
    const endPoint = this.state.address + "srv_status"
    axios.get(endPoint)
      .then((response) => {
        // handle success
        status = response.status
        if (status != 200) {
          // wait for 1 second and try again
          setTimeout(getStatus, 1000);
        }
        else {
          // If server is running set status to 200
          this.setState({
            srvStatus: status,
            socket: io(this.state.address)
          })

          // Intialize the workspace on the server
          this.createWorkspace()
        }
      })
      .catch((error) => {  // handle error
        // update the status code
        status = (error.response && error.response.status) || status;
        if (status == 404) {
          api.init('http://127.0.0.1:5000/');

          // the address doesn't contain the api
          this.setState({  // fallback to the development server.
            address: 'http://127.0.0.1:5000/'
          })
        }
        // handle error, wait for 1 second and try again
        setTimeout(getStatus, 1000);
      })
  }

  /**
   * Creates a workspace for the ETL interface.
   * @param  {string} workspace - workspace path
   */
  createWorkspace(workspace = "") {
    const endPoint = this.state.address + "CreateWorkspace"
    axios.post(endPoint, { 'workspace': workspace })
      .then((res) => {
        this.setState({ isReady: true });
      })
      .catch(err => console.warn(err));
  }

  /**
   * Check if the files in the load nodes
   * in the current redux state are present
   */
  checkPipelineFilesValid() {
    const loadNodes = selectNodes(store.getState().graph, 'LOAD_FILE')
    const endPoint = this.state.address + "IsFilePresent"
    for (var i = 0; i < loadNodes.length; i++) {
      if (!loadNodes[i].config.path) continue;

      const payload = {
        path: loadNodes[i].config.path,
        nodeID: loadNodes[i].ID
      }
      axios.post(endPoint, payload)
        .then(function (response) {
          // handle success
          if (response.data == 'OK') {
            store.dispatch(setIsFileAvailable(payload.nodeID, /*isAvailable=*/ true))
          }
          else {
            store.dispatch(setIsFileAvailable(payload.nodeID, /*isAvailable=*/ false))
          }
        })
        .catch(function (error) {
          // handle error
          console.error(error)
          store.dispatch(setIsFileAvailable(payload.nodeID, /*isAvailable=*/ false))
        })
    }
  }

  onLoadPipeline(selectedFile) {
    const isUpToDate = store.getState().global.isSaved;
    const autoSaveName = store.getState().global.autoSaveName;

    const handleYes = () => {
      api.deleteFile('Pipelines', autoSaveName, () => { }, (err) => console.error(err));
      this.onConfirmLoadPipeline(selectedFile);
    }

    if (isUpToDate) {
      // delete the existing autosave pipeline name.
      handleYes();
    } else {
      ConfirmDialog(
        `There are unsaved changes that will be discarded. Are you sure you want to continue?`,
        handleYes
      );
    }
  }

  /**
   * Sends a call to the server to loads a selected pipeline
   * and send the pipeline back
   * @param  {string} selectedFile - filename for the stored pipeline
   */
  onConfirmLoadPipeline(selectedFile) {
    mixpanel.track("Load Pipeline");
    const endPoint = this.state.address + "LoadServerPipeline"
    const payload = {
      folder: "Pipelines",
      name: selectedFile
    }
    const setState = this.setState.bind(this)
    const checkPipelineFilesValid = this.checkPipelineFilesValid.bind(this)
    return axios.post(endPoint, payload)
      .then(function (response) {
        // handle success
        store.dispatch(setSampleStatus(false));
        const appState = response.data

        if (appState.hasOwnProperty('global')) {
          store.dispatch(setPipelineName(appState.global.pipelineName));
          store.dispatch(setAutoSaveName(appState.global.autoSaveName));
        } else {
          // set the pipeline name to the selected file
          store.dispatch(setPipelineName(selectedFile));
        }

        if (appState.hasOwnProperty("graph")) {
          store.dispatch(setStateFromFile(appState.graph));
        } else {
          // for backwards compatability
          store.dispatch(setStateFromFile(appState));
        }

        checkPipelineFilesValid();
      })
      .catch(function (error) {
        // handle error
        console.error(error)
      })
  }

  /**
   * Loads a pre-packeged sample pipeline.
   * @param {json} appState - Object which describes the pipeline.
   */
  onLoadSamplePipeline(appState) {
    store.dispatch(setStateFromFile(appState))
    store.dispatch(setPipelineName(''));
    store.dispatch(setSampleStatus(true));
    this.checkPipelineFilesValid()
  }

  /**
   * Resets the app to an intial state with no actions
   */
  onResetPipeline(showMessage = true) {
    const resetPipeline = () => {
      mixpanel.track("New Pipeline");

      const autoSaveName = store.getState().global.autoSaveName;

      // delete the existing autosave pipeline name.
      api.deleteFile('Pipelines', autoSaveName, () => { }, (err) => console.error(err));

      store.dispatch(resetGlobalState());
      store.dispatch(resetState());
    }

    if (showMessage) {
      ConfirmDialog(
        `Creating a new pipeline will discard any unsaved changes. Do you want to continue?`,
        resetPipeline
      )
    }
    else {
      resetPipeline()
    }
  }

  /** Send a message to the logger. */
  errorHandler(error, info) {
    const endPoint = this.state.address + "error-logger"
    axios.post(endPoint, { 'message': error.message, 'stacktrace': info.componentStack })
      .catch(err => console.error(err));
  }

  render() {
    if (this.state.srvStatus != 200 || !this.state.isReady) {
      if (this.state.srvStatus == 200) {
        this.createWorkspace();  // setup the workspace
      }

      // Shows spinner if exe not ready
      const loaderStyle = {
        marginTop: window.innerHeight / 2 - 200
      };
      return <div className="loaderContainer">
        <div className="loaderBarAText"
          style={loaderStyle}>
          Starting AK Engine
        </div>
        <div className="loaderBarA" />
      </div>
    }

    // Show main interface
    return (
      <AddressContext.Provider value={{ socket: this.state.socket, address: this.state.address }}>
        <InfoToastContextProvider>
        <HashRouter>
          <Switch>
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={this.errorHandler.bind(this)} >
              <Route exact path='/' >
                <NaviBarLanding />
                <ProjectLoad
                  navbarH={33}
                  resetPipeline={this.onResetPipeline.bind(this, false)}
                  loadPipeline={this.onConfirmLoadPipeline.bind(this)}
                  loadSamplePipeline={this.onLoadSamplePipeline.bind(this)}
                />
                {this.props.control}
              </Route>
              <Route path='/data-transformer' >
                <CleanseLayout />
                {this.props.control}
              </Route>
              <Route path='/pattern-browser-bubble' >
                <PatternBrowserBubbleLayout />
                {this.props.control}
              </Route>
              <Route path='/pattern-browser-card' >
                <PatternBrowserCardLayout />
                {this.props.control}
              </Route>
              <Route path='/causal-explorer' >
                <CausalExplorerLayout />
                {this.props.control}
              </Route>
              <Route path='/feature-explorer' >
                <FeatureExplorerLayout />
                {this.props.control}
              </Route>
              <Route path='/visualizer' >
                <VisualizerLayout />
                {this.props.control}
              </Route>
              <Route path='/main' >
                <Provider store={store}>
                  <Main navbarH={35} />
                  <NaviBarMain
                    onResetPipeline={this.onResetPipeline.bind(this)}
                    onLoadPipeline={this.onLoadPipeline.bind(this)}
                    getPipelineState={store.getState}
                    onGoToLink={this.props.onGoToLink.bind(this)}
                    onClose={this.props.onClose}
                  />
                  {this.props.control}
                </Provider>
              </Route>
            </ErrorBoundary>
          </Switch>
        </HashRouter>
        </InfoToastContextProvider>
      </AddressContext.Provider>
    );
  }

}
