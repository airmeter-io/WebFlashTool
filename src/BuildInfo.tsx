import './App.css';

import React from 'react';
import {BuildManager} from './Business/BuildManager.ts'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface IBuildInfoProps {
    Build : BuildManager;
}

interface IBuildInfoState {

}

class BuildInfo extends React.Component<IBuildInfoProps, IBuildInfoState> {
  private _hasDownloaded = false;
  constructor(props) {
    super(props);

  }


 
  async componentDidUpdate(prevProps) {

  }

  async componentDidMount () {

  }

  async componentWillUnmount () {
 
  }

  render() {
    return (<div>

      <div className='builddescription'>
      <ReactMarkdown children={this.props.Build.Release.body} remarkPlugins={[remarkGfm]} />
        
      </div>
    </div>)
  }
}


export default BuildInfo;
