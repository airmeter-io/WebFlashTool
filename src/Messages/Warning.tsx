import React from 'react';

interface IWarningProps {
   Title : string;
   Message : string;
}

interface IWarningState {
}


class WarningMessage extends React.Component<IWarningProps, IWarningState> {

    constructor(props) {
      super(props);
    }

   

    render() { 
      return (
        <div className="alert alert-warning">
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

export {WarningMessage}
