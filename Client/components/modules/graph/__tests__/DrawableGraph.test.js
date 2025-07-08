import React from 'react';
import { Provider } from 'react-redux';

import DrawableGraph from '../components/DrawableGraph';
import { LOAD_FILE, CLEANSE } from "../../config/components/Config"
import { addNode, addEdge } from '../graph.actions';
import { createTestStore } from '../../store';

import { wait, render, screen, cleanup, fireEvent } from "@testing-library/react";

window.setImmediate = window.setTimeout;

jest.mock('mixpanel-browser');

let store;
describe("DrawableGraph renderer", () => {

  beforeEach(() => {
    store = createTestStore();
  });

  afterEach(cleanup);
  
  it("Creates and renders the DrawableGraph", () => {
    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 50, y: 50}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 100, y: 70}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 30, y: 40}, config: null}));

    const props = {
      nodeSide: 60,
      gridSide: 45,
      dragEdge: {
        edgeInLoc: null,
        edgeOutLoc: null
      }
    }

    render(      
      <Provider store={store}>
        <div data-testid='container' style={{width: 300, height: 300}}>
        <DrawableGraph {...props}/>
        </div>
      </Provider>      
    );

    expect(screen.queryByTestId('mouse-link')).toBeNull();  // no mouse link
    expect(screen.queryByTestId('link')).toBeNull();  // no edges
    
    const outPorts = screen.getAllByTestId('out-port');    
    fireEvent.mouseOver(outPorts[0]);
    fireEvent.mouseDown(outPorts[0]);

    fireEvent.mouseMove(outPorts[0], {clientX: 200, clientY: 80});
    expect(screen.queryByTestId('mouse-link')).toBeTruthy();

    //screen.debug();
    fireEvent.mouseUp(outPorts[0]);
    expect(screen.queryByTestId('mouse-link')).toBeNull();

    // no edges to be created
    expect(store.getState().graph.edges).toEqual([]);

    fireEvent.mouseOver(outPorts[0]);
    fireEvent.mouseDown(outPorts[0]);

    // should snap to it
    fireEvent.mouseMove(outPorts[0], {clientX: 95, clientY: 105});
    expect(screen.queryByTestId('mouse-link')).toBeTruthy();
    const mousePath = screen.getByTestId('mouse-link');
    //expect(mousePath.getAttribute("d")).toBe("M100,80C100,80,100,100,100,100");

    fireEvent.mouseUp(outPorts[0]);

    // new edge should exist
    expect(store.getState().graph.edges).toHaveLength(1);
    expect(screen.queryByTestId('mouse-link')).toBeNull();

    // Mouse drawing should be disabled
    fireEvent.mouseMove(outPorts[0], {clientX: 95, clientY: 105});
    expect(screen.queryByTestId('mouse-link')).toBeNull();

    expect(screen.queryByTestId('link')).toBeTruthy();    
  });
});
