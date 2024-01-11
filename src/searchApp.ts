import { default as axios } from "axios";
import * as querystring from "querystring";
import {
  TeamsActivityHandler,
  CardFactory,
  TurnContext,
  MessagingExtensionQuery,
  MessagingExtensionResponse,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
} from "botbuilder";
import * as ACData from "adaptivecards-templating";
import helloWorldCard from "./adaptiveCards/helloWorldCard.json";
import incidentCard from './adaptiveCards/IncidentDetails.json';

export class SearchApp extends TeamsActivityHandler {
  constructor() {
    super();
  }

  protected handleTeamsMessagingExtensionCardButtonClicked(_context: TurnContext, _cardData: any): Promise<void> {
    return Promise.resolve();
  }
  protected handleTeamsMessagingExtensionSubmitAction(_context: TurnContext, _action: MessagingExtensionAction): Promise<MessagingExtensionActionResponse> {
       return Promise.resolve({task: {type: 'message', value: 'Thanks!'}});
   }

  // Search.
  public async handleTeamsMessagingExtensionQuery(
    context: TurnContext,
    query: MessagingExtensionQuery
  ): Promise<MessagingExtensionResponse> {
    //const searchQuery = query.parameters[0].value;
    let qfilterBy = query.parameters.find(param => param.name.toLowerCase() === 'filterby')?.value || "";
   // let qDesc = "";
    let IncidentNumber = "";
    let IncidentName = "";
    let IncidentCreator="";
    let Priority='';
    let state = "";
    //let qLatestComments = "";
    if (qfilterBy) {
      try {
        const filters = JSON.parse(qfilterBy);
        console.log('filters ' + JSON.stringify(filters));
        filters.forEach(filter => {
          const attribute = filter.column;
          const value = isNaN(filter.value) ? filter.value : Number(filter.value); // Convert to number if possible
          
          switch (attribute.toLowerCase()) {
            case 'incidentnumber':
              IncidentNumber=value;
             console.log ("Number ="+ IncidentNumber);
            break;
            case 'incidentdescription':
              IncidentName=value;
              console.log ("Number ="+ IncidentName);
             break;
             case 'incidentcreator':
              IncidentCreator=value;
              console.log ("Number ="+ IncidentCreator);
             break;
             case 'priority':
              Priority=value;
              console.log ("Priority ="+ Priority);
              break;
            case 'state':
              state=value;
             // qState = value;
              break;
         /*   case 'latestcomments':
              qLatestComments = value;
              break;    */                     
            default:
              console.log('Invalid attribute provided');
          }
        });
      } catch (e) {
        console.log('Error parsing filterBy JSON', e);
      }
    }
    //const IncidentName = query.parameters.find(param => param.name.toLowerCase() === 'incidentdescription')?.value || ""; // default to 0
    //const IncidentNumber = query.parameters.find(param => param.name.toLowerCase() === 'incidentnumber')?.value || 0; // default to 0 'INC0107540';//
   // const IncidentCreator = query.parameters.find(param => param.name.toLowerCase() === 'incidentcreator')?.value || ""; // default to 0
    const searchDateRange = query.parameters.find(param => param.name.toLowerCase() === 'daterange')?.value || "";
    const status = query.parameters.find(param => param.name.toLowerCase() === 'status')?.value || "";
    const qLatestComments = query.parameters.find(param => param.name.toLowerCase() === 'latestcomment')?.value || "";
    const qAttributes = query.parameters.find(param => param.name.toLowerCase() === 'attributes')?.value || "";
    const attributeArray = qAttributes.split(',').map(value => value.trim());
    const activityDueExists = attributeArray.includes("activity_due")? true : false;
    const newCommentsExists = attributeArray.includes("comments")? true : false;

   console.log('query ' + JSON.stringify(query.parameters));
   const currentDate = new Date();
console.log('Attributes: ' + qAttributes);
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      console.log('formating date ' + `${year}-${month}-${day}`)
      return `${year}-${month}-${day}`;
    };
    var queryParam = '';
    if (IncidentName != '') {
      queryParam += 'short_descriptionLIKE' + IncidentName
    }
     if(IncidentNumber != ''){
       if(queryParam != '')
    queryParam += '^';
    queryParam += 'number =' + IncidentNumber;
       }
    if (status != '') {
      if (queryParam != '')
        queryParam += '^';
      if(status.includes('In_Progress') || status.includes('"In Progress'))
      //queryParam += 'state.display_value=' + status;
      queryParam += 'state=2';// + status;
      else if(status.includes('New'))
      queryParam += 'state=1';
      else
      queryParam += 'state=3';
    }
    if (qLatestComments != '') {
      if (queryParam != '')
        queryParam += '^';
      queryParam += 'sys_updated_on>' + (currentDate.getDate() - 7);
    }
    if(IncidentCreator!=''){
    IncidentCreator=''; //Need to comment.
      if (queryParam != '')
      queryParam += '^';
      queryParam += 'opened_by.email=' + IncidentCreator;
    }

    if (searchDateRange != '') {
    
      const pastStartDate = new Date(currentDate);
      if (searchDateRange.toLowerCase() == 'past_week') {
        pastStartDate.setDate(currentDate.getDate() - 7);
      } else if (searchDateRange.toLowerCase() == 'past_month') {
        pastStartDate.setDate(currentDate.getDate() - 30);
      }
      else if (searchDateRange.toLowerCase() == 'yesterday') {
        pastStartDate.setDate(currentDate.getDate() - 1);
      }
      console.log('pastStartDate ' + pastStartDate);
      const formattedPastStartDate = formatDate(pastStartDate);
      console.log('formattedPastStartDate ' + formattedPastStartDate);
      if (queryParam != '')
        queryParam += '^';
      if(newCommentsExists)
      queryParam += 'sys_updated_on> ' + formattedPastStartDate + '^sys_updated_on<=' + formatDate(currentDate) // opened_at>=2023-09-25^opened_at<2023-09-26
      else if(!activityDueExists)
      queryParam += 'opened_at>= ' + formattedPastStartDate + '^opened_at<' + formatDate(currentDate) // opened_at>=2023-09-25^opened_at<2023-09-26
      else
      queryParam += 'activity_due>= ' + formattedPastStartDate ;// opened_at>=2023-09-25^opened_at<2023-09-26
    }
    if(Priority.toLowerCase()=='high'){
     let priority=1;
      if (queryParam != '')
      queryParam += '^';
      queryParam += 'priority=' + priority;
    }

    const headerAuth = {
      'Authorization': 'Basic accessToken',
      'Cookie': ''
    }
    console.log('queryParam before SN ' + queryParam);
    const sysparam_fields = 'number,short_description,opened_at,sys_id,work_notes,comments,activity_due,sys_updated_on,assigned_to,state,priority';
    const response = await axios.get(
      `https://Service Now customer instance /api/now/table/incident?${querystring.stringify({
        sysparm_query: queryParam,
        sysparm_limit: 4,
        sysparm_fields: sysparam_fields,
        sysparm_display_value: 'true',
      })}`,
      {
        headers: headerAuth

      }
    );
    const viewIncident = 'Service Now Incident URL';
    const attachments = [];
    let attachment = {};  
    response.data.result.forEach((obj) => {
      console.log('response ' + obj.number);
      const commentJson = JSON.stringify(obj.comments);
      console.log('comments ' + commentJson);
      if(qLatestComments !='')
      {
        let latestComments = getLatestComments(obj.sys_updated_on, commentJson);
        if(latestComments.length>0)
        console.log('latestComments ' + latestComments[0].message);
        attachment = getAdaptiveCard(obj,latestComments[0].message,viewIncident);
      }
      else
      {
        attachment = getAdaptiveCard(obj,obj.comments,viewIncident);
      }
      attachments.push(attachment);
     });
console.log('attachments ' + JSON.stringify(attachments[0]));
    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: attachments,
      },
    };

  }
}
// Function to replace placeholders with data
function fillTemplate(template, data) {
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, data[key]);
    }
  }
  return template;
}

function getLatestComments(dateToSearch, input) {
  // Split the input string into individual comments using the double newline separator
  const comments = input.split('\n\n');
  dateToSearch = "13-10-2023 13:02:49";
  // Loop through the comments and find the one that matches the date
  /*let matchingComment = null;
  for (const comment of comments) {
    if (comment.includes(dateToSearch)) {
      matchingComment = comment;
      break; // Stop searching once a match is found
    }
  }
  
  if (matchingComment) {
    console.log("Matching Comment:", matchingComment);
  } else {
    console.log("No matching comment found.");
  } */
  // Sample incident updates data (replace with your actual data)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoTimestamp = oneWeekAgo.toISOString();

  const relevantUpdates = comments.filter((update) => update.timestamp > oneWeekAgoTimestamp);

  if (relevantUpdates.length > 0) {
    console.log('Relevant updates found:');
    for (const update of relevantUpdates) {
      console.log(`Timestamp: ${update.timestamp}, Message: ${update.message}`);
    }
  } else {
    console.log('No relevant updates found.');
  }

  return relevantUpdates;
}

function getAdaptiveCard(obj: any,comments: any,viewIncident: any) {
  const assignedToEmail = (obj.assigned_to.display_value!=null|| obj.assigned_to.display_value !=undefined)?obj.assigned_to.display_value:'Not Assigned';
  console.log('assignedToEmail ' + assignedToEmail);
  const incidentData = {
    number: obj.number,
    short_description: obj.short_description,
    comments: comments,
    work_notes: obj.work_notes,
    due_on: obj.activity_due,
    assignedTo: assignedToEmail,
    viewUrl: viewIncident,
    state: obj.state,
    Priority: obj.priority,
  };

  //const dataAC= JSON.parse(incidentData);
  const template = new ACData.Template(incidentCard);
  const adaptiveCard = template.expand({
    $root: incidentData,
  });
//  console.log('adaptiveCard ' + JSON.stringify(adaptiveCard));
  const preview = CardFactory.heroCard(obj.number);
  const attachment = { ...CardFactory.adaptiveCard(adaptiveCard), preview };
  return attachment;
}