/**
 * 
 */
import  { useState, useEffect, useRef, ChangeEvent  } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
        
        

/** Interfaces Start */
    interface ApiResponse {
        data: Title[];
        pagination: Pagination;
    }

    interface Pagination {
        total: number;
        limit: number;
        offset: number;
        total_pages: number;
        current_page: number;
        prev_url: string;
        next_url: string;
    }

    interface Title {
        id: number;
        title: string;
        place_of_origin: string;
        artist_display: string;
        inscriptions: string;
        date_start: number;
        date_end: number;
    }
/** Interfaces End  */



export default function App() {
    /** Declarations start */
        const [titles, setTitles] = useState<Title[]>([]);        
        /** Selected rows are remembered because selectedTitles is gloabl to DataTable */
        const [selectedTitles, setSelectedTitles] = useState<Title[] | null>(null);
        /** For pagination and table render */
        const [pagination, setPagination] = useState<Pagination | null>(null);
        const [loading, setLoading] = useState<boolean>(true);
        const [error, setError] = useState<string | null>(null);
        
        const op = useRef<OverlayPanel>(null)
        const toast = useRef<Toast>(null);
        const debounceTimeout = useRef<number | undefined>(undefined); 

        /** Storing the desired field name to later use in maping **/
        const fields : string[] = ["title", "place_of_origin", "artist_display", "inscriptions", "date_start", "date_end"];
        const headers : string[] = fields.map(field => field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')) // capitalising the fields
    /** Declaration ends */
    
    useEffect(()=>{
        updateTableStates(1);
        },[])

    /** Fetch records based on page number and record limit **/
    const fetchData = async (page: number, limit:number): Promise<{ titles: Title[], pagination: Pagination}> => {
        console.log("Limit: "+limit);
        try {
            const response = await fetch(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${limit??12}`);
            if (!response.ok) {
                throw new Error('Ugh! It\'s not me. It\s the backend folks. I swear.');
            }
            const data: ApiResponse = await response.json();

            console.log("Current Page: " + page);
            const filteredData: Title[] = data.data.map((record: Title) => {
                /** Why even store all those keys? **/
                const { id, title, place_of_origin, artist_display, inscriptions, date_start, date_end } = record;
                return { id, title, place_of_origin, artist_display, inscriptions, date_start, date_end };
            });
            return { titles: filteredData, pagination: data?.pagination };
        } catch (error) {
            setError((error as Error).message);
            return { 
                titles: [], 
                pagination: {
                    total: 0, 
                    limit: 0, 
                    offset: 0, 
                    total_pages: 0, 
                    current_page: 0, 
                    prev_url: '', 
                    next_url: ''
                }
            };
        } finally {
            setLoading(false);
        }
    };


    /** Updating states used in DataTable like titles and pagination  **/
    const updateTableStates = async(page:number):Promise<void> => {
        setLoading(true);
        const {titles, pagination} = await fetchData(page,12);
        console.log(titles)
        setTitles(titles);
        setPagination(pagination);
    }
    
    /** Toasts */
    const showError = (message:string = "Undefined Error") => {
        console.log(toast);
        toast.current?.show({severity:'error', summary: 'Error', detail:message, life: 3000});
    }

    /** Custom Row Selector Handler */
    const rowSelectorHandler = async (e: ChangeEvent<HTMLInputElement>):Promise<void> => {
        const newValue:number = parseInt(e.target?.value)|| 0;

        /** Negative numbers */
        if(newValue<0){
            showError("Input can not be negative");
            return;
        } 

        /**  Clear the previous timeout */
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = window.setTimeout(async():Promise<void> => {
            if(newValue>100){
                showError("Can not select more than 100 records at once");
                return;
            }       
            if(newValue!=0){
                const {titles} = await fetchData(1,newValue);
                console.log(titles)
                setSelectedTitles(titles);
            }
          else setSelectedTitles(null);
        },500); 
    }

    const CustomSelector = () => 
    <div id='custom-selector' >
        <Button size= 'small' type="button" icon="pi pi-angle-down"onClick={(e) => op.current?.toggle(e)} />
        <OverlayPanel ref={op}>
            <InputText type="number" min="0" autoFocus className="p-inputtext-sm"  placeholder="Enter number of rows"
            onChange={rowSelectorHandler} />
        </OverlayPanel>
    </div>    

    if (loading) return <h1>Loading...</h1>;
    if (error) return <h1>Error: {error}</h1>;

    return (
        <div className="card">
            <Toast ref={toast} />
            <DataTable 
                value={titles} 
                paginator 
                    rows={ pagination?.limit} 
                    totalRecords={pagination?.total ?? 0}  
                    emptyMessage="No records found"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                    lazy
                    onPage={(e)=>{
                        const page = e.page ?? 0;
                        updateTableStates(page+1)}}
                    first={pagination?.offset}
                selectionMode={'multiple'} 
                selection={selectedTitles!}
                onSelectionChange={(e) => setSelectedTitles(e.value)} dataKey="id" tableStyle={{ minWidth: '50rem' }}
                >
                    

                    
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}
                    header = <CustomSelector/>
                    >
                        

                    </Column>
                    
            

                    {fields.map((field, index) => (
                        <Column key={index} field={field} header={headers[index]} />
                    ))}
            </DataTable>


        </div>
    );
}
        