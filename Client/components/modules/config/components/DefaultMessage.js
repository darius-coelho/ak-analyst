import React from 'react';

import Container from 'react-bootstrap/Container';
import Alert from 'react-bootstrap/Alert';

export function DefaultMessage(props) {
  return (
    <Container>
      <Alert variant={'warning'} style={{marginTop: 5}}>
      <p style={{textAlign: "center"}}>{props.text}</p>
      </Alert>
    </Container>
  );
}

export default DefaultMessage;
