import React from 'react';

interface ISuccessProps {
   Title : string;
   Message : string;
}

interface ISuccessState {
}


class SuccessMessage extends React.Component<ISuccessProps, ISuccessState> {

    constructor(props) {
      super(props);
    }

   

    render() { 
      return (
        <div className="alert alert-success">
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

export {SuccessMessage}
