import React from 'react';
import { Provider } from 'react-redux';
import { createTestStore } from '../../store';
import { addNode, addEdge } from '../graph.actions';
import { LOAD_FILE, CLEANSE } from "../../config/components/Config"
import FlowGraph from '../components/FlowGraph';

import { wait, render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from '@testing-library/user-event';


window.setImmediate = window.setTimeout;

jest.mock('mixpanel-browser');

let store;
describe("DrawableGraph renderer", () => {

  beforeEach(() => {
    store = createTestStore();
  });

  afterEach(cleanup);

  it("Creates and renders the FlowGraph", () => {
    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 50, y: 50}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 100, y: 70}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 30, y: 40}, config: null}));

    const nodeSide = 52 * 1/window.devicePixelRatio
    const gridSide = 40 * 1/window.devicePixelRatio
    
    render(
      <Provider store={store}>
        <FlowGraph
          setDragEdge={jest.fn()}
          dragEdge={{ edgeInID: null, edgeOutID: null, edgeInLoc: null, edgeOutLoc: null }}
          nodeSide={nodeSide}
          gridSide={gridSide}
        />
      </Provider>      
    );

    const boxes = screen.getAllByTestId("holder");
    expect(+boxes[0].getAttribute("x")).toBe(50);
    expect(+boxes[0].getAttribute("y")).toBe(50);
    expect(+boxes[0].getAttribute("width")).toBe(2*gridSide);
    expect(+boxes[0].getAttribute("height")).toBe(2*gridSide);
    
    expect(+boxes[1].getAttribute("x")).toBe(100);
    expect(+boxes[1].getAttribute("y")).toBe(70);
    expect(+boxes[1].getAttribute("width")).toBe(2*gridSide);
    expect(+boxes[1].getAttribute("height")).toBe(2*gridSide);    

    expect(+boxes[2].getAttribute("x")).toBe(30);
    expect(+boxes[2].getAttribute("y")).toBe(40);
    expect(+boxes[2].getAttribute("width")).toBe(2*gridSide);
    expect(+boxes[2].getAttribute("height")).toBe(2*gridSide);
   
    const container = screen.getByTestId('content-container');
    userEvent.click(container);

    userEvent.keyboard('{Delete}');
    expect(Object.keys(store.getState().graph.nodes)).toHaveLength(2);
  });
});
