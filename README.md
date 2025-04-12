# Cut List Tool

My web-based tool to optimise cutting plans for linear materials like wood, metal bars, or any other material that needs to be cut from stock lengths. Created to replace the late, great '[filltools](http://www.filtools.com/cutlist)' - you'll never know how many projects you helped me with. Initial version one-shotted with Claude Sonnet 3.7. Which is ridiculous.

## Features

- **Visual Cutting Plans**: See exactly how each piece will be cut from your stock
- **Auto-Named Parts**: Parts are automatically assigned names (A, B, C, etc.) for easy reference
- **Waste Optimisation**: Algorithm minimises waste by efficiently arranging cuts
- **Kerf Compensation**: Accounts for material lost in each cut
- **Batch Entry**: Add multiple parts or stock lengths via comma-separated values
- **Real-time Calculations**: Cutting plan updates automatically as you add/remove parts
- **Customisable Part Names**: Rename parts for better organisation
- **Stock Management**: Add both standard stock lengths and custom lengths

## How to Use

### Adding Parts

1. Enter the length of the part you need in millimeters (or any unit as long as you're consistant across measurements)
2. Set the quantity if you need multiple pieces of the same length
3. Click "Add" or press Enter
4. To add multiple lengths at once, enter comma-separated values (e.g., "100, 200, 300")

### Managing Parts

- **Adjust Quantity**: Use the + and - buttons to add or remove pieces of a particular length
- **Edit Names**: Click on any part name to edit it
- **Remove Parts**: Click "Delete All" to remove all parts of a specific length

### Setting Up Stock

1. Enter your default stock length (common size you typically use)
2. Click "Add Default" to add this to your available stock
3. For custom stock lengths, enter them in the "Custom Length" field
4. Add multiple stock lengths at once with comma-separated values

### Kerf Width

Set the width of your saw blade or cutting tool to account for material lost in each cut.

### Reading the Cutting Plan

The optimiser automatically calculates the most efficient way to cut your parts from the available stock:

- Each stock piece shows a visual representation of cuts
- Colours indicate parts and waste areas
- Detailed cutting list shows the exact position to make each cut
- The system displays total waste and percentage efficiency

## Tips for Best Results

- Add your most common stock length as the default
- Enter all parts before generating a cutting plan
- For closely sized parts, consider making them identical when possible to improve efficiency
- Review the visual cutting plan carefully before making physical cuts

## Technical Details

- Built with React
- Uses a modified First-Fit Decreasing algorithm with waste optimisation
- All calculations happen in the browser - no data is sent to any server
