import React from 'react';
import CellSplitControl from "../../components/transformer/control/CellSplitControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for CellSplitControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onTransform = jest.fn();    
    
    const props = {
      tType: "CellSplit",
      attr: 'a',
      onTransform,
    };


    render(<CellSplitControl {...props} />);
    expect(screen.queryByText(/Cell Split Type:/)).toBeTruthy();

    // Get input field
    const delimInput = document.querySelector('.coreTextInput')
    
    // Check input field
    expect(delimInput).toBeTruthy();
    
    // Change attribute to b
    delimInput.focus()
    userEvent.type(delimInput, ',')
    
    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);

    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))
    
    const expectedTransform ={
      tType: props.tType, 
      attr: props.attr,
      delimiter: ',',
      ordered: true,
      quote: '',
      strip: ''
    }
 
     // Check that the apply transfrom has been called once with the expected transform
     expect(onTransform).toHaveBeenCalledWith(expectedTransform)
     expect(onTransform).toHaveBeenCalledTimes(1);
  });
});
