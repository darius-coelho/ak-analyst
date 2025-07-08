import React from 'react';
import ReplControl from "../../components/transformer/control/ReplControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for ReplControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onTransform = jest.fn();
    const onSelectCats = jest.fn();

    const props = {
      tType: "Repl",
      width: 100,
      description:{
        division: ['a', 'b', 'c'],
        count: [1, 2, 3]
      },
      onTransform,
      onSelectCats
    };

    render(<ReplControl {...props} />);

    // Get react-select components    
    const selectCatsInput = document.querySelector('.selectCats input')
    const selectCatsControl = document.querySelector('.selectCats__control')
  
    // Check react-select components    
    expect(selectCatsInput).toBeTruthy();
    expect(selectCatsControl).toBeTruthy();

    // Change new attribute name
    const input1 = screen.getByTestId("repl-name")
    input1.setSelectionRange(0, 6)
    userEvent.type(input1, "{backspace}NewCat");

    // Add category NewCat
    selectCatsInput.focus()    
    userEvent.click(selectCatsControl)
    userEvent.click(screen.queryByText("a"))

    selectCatsInput.focus()    
    userEvent.click(selectCatsControl)
    userEvent.click(screen.queryByText("b"))
    
    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);    
    
    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))

    const expectedTransfrom ={
      tType: props.tType, 
      old_vals: ['a', 'b'],
      new_val: "NewCat"
    }

    // Check that the apply transfrom has been called once with the expected transform    
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom)
    expect(onTransform).toHaveBeenCalledTimes(1);    
    expect(onSelectCats).toHaveBeenCalledTimes(3);   
  });
});
