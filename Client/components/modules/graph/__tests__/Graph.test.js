import React from 'react';
import { Provider } from 'react-redux';
import Graph from '../components/Graph';
import { LOAD_FILE, CLEANSE } from "../../config/components/Config"
import { addNode, addEdge } from '../../graph/graph.actions';
import { selectNodes } from '../graph.selectors';

import { createTestStore } from '../../store';

import { wait, render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

window.setImmediate = window.setTimeout;

jest.mock('mixpanel-browser');

let store;
describe("Rendering a Graph", () => {
  beforeEach(() => {
    store = createTestStore();
  });

  afterEach(cleanup);

  it("Renders Jumbtron", () => {
    const props = {      
      nodeSide: 60,
      gridSide: 45,
      dragEdge: {
        edgeInLoc: null,
        edgeOutLoc: null
      },
      portMouseDown: jest.fn()
    };
    

    render(
      <Provider store={store}>
        <div style={{width: 300, height: 300}}>
        <Graph {...props} />
        </div>
      </Provider>
      
    );

    const mainSvg = screen.getByTestId('graph-svg-container');
    expect(mainSvg.style.width).toBe("inherit");
    expect(mainSvg.style.height).toBe("inherit");

    expect(screen.getByText("Drag in Actions to Get Started")).toBeTruthy();
  });
  
  it("Draws nodes", () => {    
    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 0, y: 0}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 0, y: 10}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 0, y: 0}, config: null}));    

    const props = {      
      nodeSide: 60,
      gridSide: 45,
      dragEdge: {
        edgeInLoc: null,
        edgeOutLoc: null
      },
      portMouseDown: jest.fn()
    }
    
    render(
      <Provider store={store}>
         <div style={{width: 300, height: 300}}>
          <Graph {...props} />
        </div>
      </Provider>      
    );
    
    const mainSvg = screen.getByTestId('graph-svg-container');
    expect(mainSvg.style.width).toBe("inherit");
    expect(mainSvg.style.height).toBe("inherit");

    const boxes = screen.getAllByTestId("holder");
    expect(+boxes[0].getAttribute("x")).toBe(0);
    expect(+boxes[0].getAttribute("y")).toBe(0);
    expect(+boxes[0].getAttribute("width")).toBe(90);
    expect(+boxes[0].getAttribute("height")).toBe(90);

    
    expect(+boxes[1].getAttribute("x")).toBe(0);
    expect(+boxes[1].getAttribute("y")).toBe(10);
    expect(+boxes[1].getAttribute("width")).toBe(90);
    expect(+boxes[1].getAttribute("height")).toBe(90);

    expect(+boxes[2].getAttribute("x")).toBe(0);
    expect(+boxes[2].getAttribute("y")).toBe(0);
    expect(+boxes[2].getAttribute("width")).toBe(90);
    expect(+boxes[2].getAttribute("height")).toBe(90);    
    expect(boxes[2].className.baseVal).toBe("dragit holder-focus");    

    // test background click
    userEvent.click(screen.getByTestId('graph-svg'));
    expect(boxes[2].className.baseVal).toBe("dragit holder");
    expect(store.getState().graph.focusNodes).toEqual([]);

  });

  
  it("Handles updating the svg dimensions", () => {

    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 50, y: 50}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 50, y: 60}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 50, y: 50}, config: null}));
    store.dispatch(addEdge({src: 0, dst: 1}));    
    
    const props = {
      nodeSide: 60,
      gridSide: 45,
      dragEdge: {
        edgeInLoc: null,
        edgeOutLoc: null
      },      
      portMouseDown: jest.fn()
    }
    
    render(
      <Provider store={store}>
        <div style={{width: 300, height: 300}}>
          <Graph {...props} />
        </div>
      </Provider>      
    );
    
    const boxes = screen.getAllByTestId("holder");
    const mainBox = boxes[0];
    expect(screen.queryByTestId('link')).toBeTruthy();
    expect(screen.queryByTestId('link2')).toBeTruthy();
    
    // check events
    fireEvent.mouseOver(mainBox);
    fireEvent.mouseMove(mainBox);
    fireEvent.mouseDown(mainBox);

    fireEvent.mouseMove(mainBox, {clientX: 250});
    
    fireEvent.mouseUp(mainBox);
    
    const mainSvg = screen.getByTestId('graph-svg-container');
    expect(mainSvg.style.width).toBe("495px");
    expect(mainSvg.style.height).toBe("240px");

    expect(screen.queryByTestId('mouse-link')).toBeNull();
  });
  
  it("Handles drawing the mouse link", () => {
    store.dispatch(addNode({type: LOAD_FILE, pos: {x: 50, y: 50}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 50, y: 60}, config: null}));
    store.dispatch(addNode({type: CLEANSE, pos: {x: 50, y: 50}, config: null}));

    const props = {
      nodeSide: 60,
      gridSide: 45,
      dragEdge: {
        edgeInLoc: null,
        edgeOutLoc: null
      },
      mouseLink: {source: [10, 10], target: [15, 25]}, 
      portMouseDown: jest.fn()
    }

    render(     
      <Provider store={store}>
        <div style={{width: 300, height: 300}}>
          <Graph {...props} />
        </div>
      </Provider>      
    );

    expect(screen.queryByTestId('mouse-link')).toBeTruthy();
  });
});

	 
