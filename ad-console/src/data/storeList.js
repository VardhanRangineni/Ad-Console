// Auto-generated from stores.json
// Only one country: India
import stores from '../assets/docs/stores.json';

export const storeList = stores.map(store => ({
  id: store.StoreID,
  name: store["Store Name"],
  area: store.Area,
  city: store.City,
  state: store.State,
  country: 'India'
}));
