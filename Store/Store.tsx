//This is the global state management of the application
import { configureStore } from '@reduxjs/toolkit';
import slideBarReducer from './SideBarSlice';
import NavigationReducer from './NavigationSlice';
export const Store = configureStore({
    reducer: {
        'sideBar': slideBarReducer,
        'navigation': NavigationReducer
    }
})

export type RootState = ReturnType<typeof Store.getState>
export type AppDispatch = typeof Store.dispatch;