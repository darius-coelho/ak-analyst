import React from 'react';

import { Provider } from 'react-redux';
import { createTestStore } from '../../store';
import ActionList  from '../components/ActionList';

import { wait, render, screen, cleanup, fireEvent } from "@testing-library/react";

window.setImmediate = window.setTimeout;

let store;
describe("Action List icon for drag and drop", () => {
  beforeEach(() => {
    store = createTestStore();
  });

  afterEach(cleanup);

  const gridSide = 45
  const nodeSide = 50
  
  it("Draws the draggable action list", () => {
    render(      
      <Provider store={store}>
        <ActionList setDragEdge={jest.fn()} nodeSide={nodeSide} gridSide={gridSide} />
      </Provider>      
     );
    
    // there are 13 nodes but the drag and drop library duplicates them so check for 26
    expect(screen.queryAllByTestId('action-list-node')).toHaveLength(26);    
  });
  
});
