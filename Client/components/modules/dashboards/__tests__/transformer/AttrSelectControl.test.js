import React from 'react';
import AttrSelectControl from "../../components/transformer/control/AttrSelectControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for Multi Attribute Selector panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {        
	  const onSelectedAttrChange = jest.fn();
    const onSearchChange = jest.fn();

    const props = {      
      width: 100,
      attributes: [
        {label:'a', value: 'a', type: "Numerical"},
        {label:'b', value: 'b', type: "Numerical"},
        {label:'c', value: 'c', type: "Nominal"},
        {label:'d', value: 'd', type: "Nominal"},
      ],
      selectedType: "All",      
      selectedAttr: [],      
      onSelectedAttrChange,
      onSearchChange,
    };

    render(<AttrSelectControl {...props} />);

    // Get react-select components
    const selectAttrInput = document.querySelector('.selectAttr input')
    const selectAttrControl = document.querySelector('.selectAttr__control')
  
    // Check react-select components
    expect(selectAttrInput).toBeTruthy();
    expect(selectAttrControl).toBeTruthy();

    // Change attribute to b
    selectAttrInput.focus()
    userEvent.click(selectAttrControl)
    userEvent.click(screen.queryByText("b"))

    expect(onSelectedAttrChange).toHaveBeenCalledTimes(1); 
  });
});
