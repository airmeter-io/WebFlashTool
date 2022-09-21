import './App.css';

import React from 'react';
import {BuildManager, IBuildFile, IManifestBuildPart } from './Business/BuildManager.ts'
import { Connect, IConnectionChangeInfo} from './Connect.tsx'
import { PartitionTable  } from './Business/PartitionTable.ts';
import { BoardManager } from './Business/BoardManager.ts';
import { BuildPartitionStage } from './BuildPartitions.tsx';
import { compareBytes } from './Utility/BitConvert.ts';




interface IBuildPartitionProgressProps {
  Title : string;  
  Value : number;
}



interface IBuildPartitionProgressState {
}

class BuildPartitionProgress extends React.Component<IBuildPartitionProgressProps, IBuildPartitionProgressState> {
 
  constructor(props) {
    super(props);
  
   
  }

  async componentDidUpdate(prevProps) {

  }

  async componentDidMount () {

  }

  render() {
   
    return [(
      <div className="progressTitle">{this.props.Title} {this.props.Value}%</div>),
      (
      <div className="progressBarContainer">
        <div className="progressBar" role="progressbar" style={{width: this.props.Value+"%"}} aria-valuenow={this.props.Value} aria-valuemin="0" aria-valuemax="100">

        </div>
      </div>)
      ]
   
  }
}


export {BuildPartitionProgress};
