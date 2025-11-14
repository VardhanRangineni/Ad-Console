export const mockLocations = {
    id: 1,
    name: "All Locations",
    type: "root",
    children: [
      {
        id: 2,
        name: "United States",
        type: "country",
        children: [
          {
            id: 3,
            name: "California",
            type: "state",
            children: [
              {
                id: 4,
                name: "Los Angeles",
                type: "city",
                children: [
                  { id: 5, name: "Store LA-01", type: "store", orientation: "horizontal", status: "online" },
                  { id: 6, name: "Store LA-02", type: "store", orientation: "vertical", status: "online" }
                ]
              },
              {
                id: 7,
                name: "San Francisco",
                type: "city",
                children: [
                  { id: 8, name: "Store SF-01", type: "store", orientation: "horizontal", status: "online" },
                  { id: 9, name: "Store SF-02", type: "store", orientation: "horizontal", status: "offline" }
                ]
              }
            ]
          },
          {
            id: 10,
            name: "Texas",
            type: "state",
            children: [
              {
                id: 11,
                name: "Houston",
                type: "city",
                children: [
                  { id: 12, name: "Store HOU-01", type: "store", orientation: "vertical", status: "online" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 13,
        name: "India",
        type: "country",
        children: [
          {
            id: 14,
            name: "Maharashtra",
            type: "state",
            children: [
              {
                id: 15,
                name: "Mumbai",
                type: "city",
                children: [
                  { id: 16, name: "Store MUM-01", type: "store", orientation: "horizontal", status: "online" },
                  { id: 17, name: "Store MUM-02", type: "store", orientation: "vertical", status: "online" }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
  