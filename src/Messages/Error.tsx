import React from 'react';

interface IErrorProps {
   Title : string;
   Message : string;
}

interface IErrorState {
}


class ErrorMessage extends React.Component<IErrorProps, IErrorState> {

    constructor(props) {
      super(props);
    }

   

    render() { 
      return (
        <div className="alert alert-error">
            <div className="alert-content">
            <div className="alert-title">
                {this.props.Title}
            </div>
            <div className="alert-body">
                <p>{this.props.Message}</p>
            </div>
            </div>
        </div>
      );
    }
}

export {ErrorMessage}
