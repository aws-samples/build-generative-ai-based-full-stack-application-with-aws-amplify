import React from "react";
import {
   SpaceBetween, ExpandableSection
} from "@cloudscape-design/components";

import { Player } from './Player'
import { Comments } from './Comments'
import { Bot } from './Bot'
 
const Class = ({
  activeClass,
  userName,
  userId,
}: {
  activeClass: any;
  userName: string;
  userId: string;
}) => {
  return (
    <>
      <SpaceBetween size="l">
        <Player classId={activeClass.id} title={activeClass.name} desc={activeClass.description} author={activeClass.author} url={activeClass.url} user={userName} uid={userId} />
        
        <Bot transcript={activeClass.transcript}></Bot>
        
        <ExpandableSection headerText="Video transcript" variant="container">
          {(() => {
            const lines = activeClass.transcript.split('\n');
            return lines.map((line: string, i: number) => (
              <React.Fragment key={i}>
                {line}
                {i !== lines.length - 1 && <br />}
              </React.Fragment>
            ));
          })()}
        </ExpandableSection>

        <Comments classId={activeClass.id} />
      </SpaceBetween>
    </>
  );
}
export { Class };