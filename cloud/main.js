/**
 * Cotton Cloud Code
 * Main entry point for Back4App Cloud Code functions
 */

// Example Cloud Function
Parse.Cloud.define("hello", async (request) => {
  return { message: "Hello from Cotton Cloud Code!" };
});

// Example beforeSave trigger
// Parse.Cloud.beforeSave("YourClassName", async (request) => {
//   const object = request.object;
//   // Add your logic here
// });

// Example afterSave trigger
// Parse.Cloud.afterSave("YourClassName", async (request) => {
//   const object = request.object;
//   // Add your logic here
// });
