import {createSlice,PayloadAction} from '@reduxjs/toolkit';
import type { RootState } from './Store';

//This slice keeps track of the state of the sidebar buttons 
interface SideBarState {
    homeButton: boolean,
    lessonButton: boolean,
    coachButton: boolean,
    rewardButton: boolean
}

//The 4 side button states
const initialState: SideBarState = {
    homeButton: true,
    lessonButton: false,
    coachButton: false,
    rewardButton: false
}
export const SideBarSlice = createSlice({
    name: 'sideBar',
    initialState: initialState,
    reducers: {
        setButtonOn: (state, action: PayloadAction<number>) => {
            switch(action.payload){
                case 0: {
                    state.homeButton = true,
                    state.lessonButton = false,
                    state.coachButton = false,
                    state.rewardButton = false
                    break;
                }
                case 1: {
                    state.homeButton = false,
                    state.lessonButton = true,
                    state.coachButton = false,
                    state.rewardButton = false
                    break;
                }
                case 2: {
                    state.homeButton = false,
                    state.lessonButton = false,
                    state.coachButton = true,
                    state.rewardButton = false
                    break;
                }
                case 3: {
                    state.homeButton = false,
                    state.lessonButton = false,
                    state.coachButton = false,
                    state.rewardButton = true
                    break;
                }

                
            }
        }
    }
})

export const {setButtonOn} = SideBarSlice.actions;

export default SideBarSlice.reducer;