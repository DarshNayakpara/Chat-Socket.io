<x-app-layout>
    


<!-- char-area -->
<section class="message-area">
  <div class="container">
    <div class="row">
      <div class="col-12">
        <div class="chat-area">
          <!-- chatlist -->
          <div class="chatlist">
            <div class="modal-dialog-scrollable">
              <div class="modal-content">
                <div class="chat-header">
                  <div class="msg-search">
                    <input type="text" class="form-control" id="inlineFormInputGroup" placeholder="Search" aria-label="search">
                    {{-- <a class="add" href="#"><img class="img-fluid" src="" alt="add"></a> --}}
                  </div>

                  <ul class="nav nav-tabs" id="myTab" role="tablist">
                   
                   
                  </ul>
                </div>

                <div class="modal-body">
                  <!-- chat-list -->
                  <div class="chat-lists">
                    <div class="tab-content" id="myTabContent">
                      <div class="tab-pane fade show active" id="Open" role="tabpanel" aria-labelledby="Open-tab">
                        <!-- chat-list -->
                        <div class="chat-list">
                            @foreach ($users as $user )
                                
                            <div class="user_list" data-id="{{$user["id"]}} " >
                            <a href="{{route('conversation',$user['id'])}}" class="d-flex align-items-center">
                              <div class="flex-shrink-0">
                                <img class="img-fluid" src="https://ui-avatars.com/api/?name={{$user["name"]}}?rounded=true" alt="user img">
                            </div>
                            <div class="flex-grow-1 ms-3">
                                <h3>{{$user["name"]}}</h3>
                                <span class="active{{$user['id']}}"></span>
                              </div>
                            </a>
                            </div>
                            @endforeach
                          

                        </div>
                        <!-- chat-list -->
                      </div>
                     
                    </div>

                  </div>
                  <!-- chat-list -->
                </div>
              </div>
            </div>
          </div>
          <!-- chatlist -->

          <!-- chatbox -->
          <div class="chatbox">
            <div class="modal-dialog-scrollable">
              <div class="modal-content">
                <div class="msg-head">
                  <div class="row">
                    <div class="col-8">
                      <div class="d-flex align-items-center">
                        
                        
                        <div class="flex-grow-1 ms-3">
                          <h3>Select User to start conversation</h3>
                        </div>
                      </div>
                    </div>
                  
                  </div>
                </div>

                {{-- <div class="modal-body">
                  <div class="msg-body">
                    <ul>
                      <li class="sender">
                        <p> Hey, Are you there? </p>
                        <span class="time">10:06 am</span>
                      </li>
                      <li class="sender">
                        <p> Hey, Are you there? </p>
                        <span class="time">10:16 am</span>
                      </li>
                      <li class="repaly">
                        <p> Last Minute Festive Packages From Superbreak</p>
                        <span class="time">10:20 am</span>
                      </li>
                      <li class="sender">
                        <p> Hey, Are you there? </p>
                        <span class="time">10:26 am</span>
                      </li>
                      <li class="sender">
                        <p> Hey, Are you there? </p>
                        <span class="time">10:32 am</span>
                      </li>
                      <li class="repaly">
                        <p>Last Minute Festive Packages From Superbreak</p>
                        <span class="time">10:35 am</span>
                      </li>
                      <li>
                        <div class="divider">
                          <h6>Today</h6>
                        </div>
                      </li>

                      <li class="repaly">
                        <p> Last Minute Festive Packages From Superbreak</p>
                        <span class="time">10:36 am</span>
                      </li>
                      <li class="repaly">
                        <p>Last Minute Festive Packages From Superbreak</p>
                        <span class="time">junt now</span>
                      </li>

                    </ul>
                  </div>
                </div>

                <div class="send-box">
                  <form action="">
                    <input type="text" class="form-control" aria-label="message…" placeholder="Write message…">

                    <button type="button"><i class="fa fa-paper-plane" aria-hidden="true"></i> Send</button>
                  </form>

                  <div class="send-btns">
                    <div class="attach">
                      <div class="button-wrapper">
                        <span class="label">
                          <img class="img-fluid" src="https://mehedihtml.com/chatbox/assets/img/upload.svg" alt="image title"> attached file
                        </span><input type="file" name="upload" id="upload" class="upload-box" placeholder="Upload File" aria-label="Upload File">
                      </div>

                    

                    
                    </div>
                  </div>

                </div> --}}
              </div>
            </div>
          </div>
        </div>
        <!-- chatbox -->

      </div>
    </div>
  </div>
  </div>
</section>
<!-- char-area -->
@push('scripts')
<script>
    var lists  = document.querySelectorAll('.user_list');
    lists.forEach(list => {
        list.addEventListener('mouseover', function(){
            list.classList.add('hovers');
            list.classList.add('pointer');
        });
        list.addEventListener('mouseout', function(){
            list.classList.remove('hovers');

        });
    })
</script>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
{{-- <script src="/socket.io/socket.io.js"></script> --}}
<script>
    let user_id = '{{Auth::user()->id}}';
   var socket = io('127.0.0.1:8005', { transports : ['websocket'] });
   socket.on("connect", () => {
        socket.emit('user_connected',user_id);
    });  

    
    socket.on("updateUserStatus",(data)=>{
        $.each(data, function(key,val){
            if(val !== null && val !==0)
            {
                let $userIcon = $(".active"+key);
                $userIcon.text("Online");
                console.log(val);
                console.log(key);

            }else
            {
                let $userIcon = $(".active"+key);
                $userIcon.text("    ");
                
            }
        });
    });

    
    
    // socket.on('connect', function(){
    //     console.log(socket.id);
    // });

</script>
@endpush

  

</x-app-layout>
