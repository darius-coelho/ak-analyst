import React from 'react';

// React context to share a web addres for the api across all components
const AddressContext = React.createContext({socket: null, address: null})

export default AddressContext;
