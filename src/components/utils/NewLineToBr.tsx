import React from 'react';

export const NewLineToBr = ({ children = "" }) => {
  return children.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index !== children.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
};