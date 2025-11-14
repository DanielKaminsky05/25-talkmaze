import {createSlice,PayloadAction} from '@reduxjs/toolkit';

interface NavigationState {
    page: string,
    prefix: string
}

const initialState: NavigationState = {
    page: "DashBoard",
    prefix: "Student"
}

export const NavigationSlice = createSlice({
    name: "navigation",
    initialState: initialState,
    reducers: {
       setPath(state, action: PayloadAction<string>) {
        state.page = action.payload;
       },
       setPrefix(state,action: PayloadAction<string>){
        state.prefix = action.payload;
       }
    }
})


export const {setPath,setPrefix} = NavigationSlice.actions;

export default NavigationSlice.reducer;
