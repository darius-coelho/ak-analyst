import React from 'react';
import FilterNominalControl from "../../components/transformer/control/FilterNominalControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for FilterNominalControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onTransform = jest.fn();
    const onSelectCats = jest.fn();

    const props = {
      tType: "FilterNom",
      width: 100,
      description:{
        division: ['a', 'b', 'c'],
        count: [1, 2, 3]
      },
      onTransform,
      onSelectCats
    };

    render(<FilterNominalControl {...props} />);

    // Get react-select components
    const selectTypeInput = document.querySelector('.selectType input')
    const selectTypeControl = document.querySelector('.selectType__control')
    const selectCatsInput = document.querySelector('.selectCats input')
    const selectCatsControl = document.querySelector('.selectCats__control')
  
    // Check react-select components
    expect(selectTypeInput).toBeTruthy();
    expect(selectTypeControl).toBeTruthy();
    expect(selectCatsInput).toBeTruthy();
    expect(selectCatsControl).toBeTruthy();

    // Change filter_type from include to exclude
    selectTypeInput.focus()
    userEvent.click(selectTypeControl)
    userEvent.click(screen.queryByText("Exclude"))

    // Add category c
    selectCatsInput.focus()    
    userEvent.click(selectCatsControl)
    userEvent.click(screen.queryByText("c"))
    
    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);    
    
    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))

    const expectedTransfrom ={
      tType: props.tType, 
      filter_type: "Exclude",
      filter_cats: ['c'],  
    }

    // Check that the apply transfrom has been called once with the expected transform    
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom)
    expect(onTransform).toHaveBeenCalledTimes(1);    
    expect(onSelectCats).toHaveBeenCalledTimes(2);    
  });
});
