/**********************************************************************************************************************/
/*                                             Global Word Initialisation                                             */
/**********************************************************************************************************************/
let fDEBUG = true;
let sDEBUG = '1.0.00';

// The initialize function must be run each time a new page is loaded
Office.onReady(function () {
  // Office is ready
  if (info.host === Office.HostType.Word) {
    // Do Word-specific initialization (for example, make add-in task pane's
    // appearance compatible with Word "green").
  }
  if (info.platform === Office.PlatformType.PC) {
    // Make minor layout changes in the task pane.
  }

  //Log Debug Information
  console.log(`DEBUG:${sDEBUGVER}:Office.js is now ready in ${info.host} on ${info.platform}`);

  $(document).ready(function () {
    // The document is ready
  });
});

/**********************************************************************************************************************/
/*                                                  Button Functions                                                  */
/**********************************************************************************************************************/

/* Description : Button Response function to insert the Custom Properties Table at the current location
*  Author      : Hany Elkady
*  Reference   :
*
*  Created     : 26-NOV-2019
*  Modified    : 26-NOV-2019
*
*  Status      : WiP
*/
function GeneTabPGInsertPTable(event) {

  //Debug Button Press
  fDEBUG ?
    insertText(`<br><font color="red"><strong>DEBUG[${sDEBUG }]:</strong></font> You Have Pressed the Insert Properties Table Button`) :
    null;

  //Provide Warning to User
  insertText('<br><em>DELETE ME Before Sending to Customer</em>');

  //Testing Insert Properties Table
  insertPropertiesTable();
  //getTableCell(theTable, 2, 2, "Hello World!");  

  //Event Completed
  event.completed();
}

/**********************************************************************************************************************/

/* Description : Button Response function to update the Custom Property from the table row at the current location
*  Author      : Hany Elkady
*  Reference   :
*
*  Created     : 26-NOV-2019
*  Modified    : 26-NOV-2019
*
*  Status      : WiP
*/
function GeneTabPGUpdateProperty(event) {

  //Debug Button Press
  fDEBUG ?
    insertText(`<br><font color="red"><strong>DEBUG[${sDEBUG }]:</strong></font> You Have Pressed the Update a Single Property Button`) :
    null;

  //Event Completed
  event.completed();
}

/**********************************************************************************************************************/

/* Description : Button Response function to update all Custom Property from the table at the current location
*  Author      : Hany Elkady
*  Reference   :
*
*  Created     : 26-NOV-2019
*  Modified    : 26-NOV-2019
*
*  Status      : WiP
*/
function GeneTabPGUpdtAllProprty(event) {

  //Debug Button Press
  fDEBUG ?
    insertText(`<br><font color="red"><strong>DEBUG[${sDEBUG }]:</strong></font> You Have Pressed the Update All Properties Button`) :
    null;

  //Event Completed
  event.completed();
}

/**********************************************************************************************************************/


/**********************************************************************************************************************/
/*                                                 Internal Functions                                                 */
/**********************************************************************************************************************/

/* Description : Internal Function to Write text to the document
*  Author      : Hany Elkady
*  Reference   : 
*
*  Created     : 26-NOV-2019
*  Modified    : 26-NOV-2019
*
*  Status      : WiP
*/
async function insertText(sSomeText, sSomeStyle) {
  await Word.run(async (context) => {

    //Get the current selection range
    var itsSelection = context.document.getSelection();

    //Add text after that selection
    var theSentance = itsSelection.insertHtml(sSomeText, Word.InsertLocation.before);
    
    // Use styleBuiltIn to use an enumeration of existing styles.
    // If your style is custom make sure to use: range.style = "name of your style";
    switch (sSomeStyle) {
      case 'Heading 1':
        theSentance.styleBuiltIn = Word.Style.heading1;
        break;
      case 'Heading 2':
        theSentance.styleBuiltIn = Word.Style.heading2;
        break;
      case 'Heading 3':
        theSentance.styleBuiltIn = Word.Style.heading3;
        break;
      case 'Heading 4':
        theSentance.styleBuiltIn = Word.Style.heading4;
        break;
      case 'Heading 5':
        theSentance.styleBuiltIn = Word.Style.heading5;
        break;
      case 'No Spacing':
        theSentance.styleBuiltIn = Word.Style.noSpacing;
        break;
        deafult:
        theSentance.styleBuiltIn = Word.Style.normal;
    };

    return context.sync(theSentance);
  });
}

/**********************************************************************************************************************/

/* Description : Internal function to insert properties table into the current location
*  Author      : Hany Elkady
*  Reference   :
*
*  Created     : 26-NOV-2019
*  Modified    : 26-NOV-2019
*
*  Status      : WiP
*/
async function insertPropertiesTable() {
  await Word.run(async (context) => {
    //Define Table Basic Outline
    const theTableData = [["Property", "Original Value", "New Value"],
    ["Title", "", ""],
    ["Subject", "", ""]];

    //Create Table after the current insertion point
    var thePropertiesTable = context.document.body.insertTable(3, 3, Word.InsertLocation.end, theTableData);
    
    //Format Table with the correct Style
    thePropertiesTable.styleBuiltIn = Word.Style.gridTable5Dark_Accent3;
    thePropertiesTable.styleFirstColumn = false;

    await context.sync();

    return thePropertiesTable;
  });
}

/**********************************************************************************************************************/

async function getTableCell(oTable, iRow, iColumn, oNewValue) {
  await Word.run(async (context) => {

    //Get the cell in question
    let theCell = oTable.getTableCell(iRow, iColumn).body;

    //If there is a value, lets write it while we have the cell
    oNewValue ? theCell.load(oNewValue) : null;

    await context.sync();
    return theCell;
  });
}

/**********************************************************************************************************************/