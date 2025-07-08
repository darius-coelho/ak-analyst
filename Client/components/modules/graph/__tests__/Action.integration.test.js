import React from 'react';
import { Provider } from 'react-redux';
import {render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

import { LOAD_FILE, CLEANSE } from "../../config/components/Config"
import { addNode, clearFocus,
	 setConfig, setNodeFocus } from '../../graph/graph.actions';
import { selectNodeByID } from '../graph.selectors';
import Action from '../components/Action';
import { createTestStore } from '../../store';

window.setImmediate = window.setTimeout;

jest.mock('mixpanel-browser');

let store;
describe("action integration test", () => {
  beforeEach(() => {
    store = createTestStore();
  });

  afterEach(cleanup);

  it("should handle callbacks to redux store", () => {
    
    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 60, y: 60}, config: null}));
    let node = selectNodeByID(store.getState().graph, 0);    
    const props = {
      ...node,
      nodeSide: 60,
      gridSide: 45,
      portMouseDown: jest.fn()
    };    
    
    const {rerender} = render(
      <Provider store={store}>
        <svg data-testid='svg-container' width={500} height={500}>
          <Action {...props} />
        </svg>
      </Provider>
    );
    
    const mainBox = screen.getByTestId('holder');    
    const outPort = screen.getByTestId('out-port');
    const ak = screen.getByTestId('akIcon');
    
    expect(+mainBox.getAttribute("x")).toBe(props.pos.x);
    expect(+mainBox.getAttribute("y")).toBe(props.pos.y);
    expect(+mainBox.getAttribute("width")).toBe(2*props.gridSide);
    expect(+mainBox.getAttribute("height")).toBe(2*props.gridSide);

    store.dispatch(clearFocus());
    expect(store.getState().graph.focusNodes).toHaveLength(0);

    const canvas = screen.getByTestId('svg-container');
    // check dragging changes the redux state
    fireEvent.mouseOver(mainBox);
    fireEvent.mouseMove(mainBox);
    fireEvent.mouseDown(mainBox);

    expect(store.getState().graph.focusNodes).toEqual([0]);

    fireEvent.mouseMove(canvas, {clientX:110});
    const nextState = store.getState().graph;
    expect(nextState.nodes[0].pos).toEqual({x:170, y:60});  

    // Rerender the component with the updated state from the store
    node = selectNodeByID(nextState, 0);    
    const nextProps = {
      ...node,
      nodeSide: 60,
      gridSide: 45,
      portMouseDown: jest.fn()
    }; 
    rerender(
      <Provider store={store}>
        <svg data-testid='svg-container' width={500} height={500}>
          <Action {...nextProps} />
        </svg>
      </Provider>
    );
   
    fireEvent.mouseUp(mainBox);

    expect(store.getState().graph.nodes[0].pos).toEqual({x:180, y:45});   
    expect(props.portMouseDown).toHaveBeenCalledTimes(0);  
  });
});
